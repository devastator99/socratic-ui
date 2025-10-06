from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import re
import uuid as uuid_lib
from typing import List, Optional, Tuple
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores.pgvector import PGVector
from langchain.schema import Document
from sqlalchemy import create_engine, Column, Integer, String, Float, Text, DateTime, JSON
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.sql import func
from tempfile import NamedTemporaryFile
from pydantic import BaseModel
from dotenv import load_dotenv
from langchain_huggingface import HuggingFaceEmbeddings
import fitz
import pandas as pd
import mimetypes
import magic
from models import TempChunks, FinalChunks, PdfUploads, Base
from celery_worker import celery_app
from solana.keypair import Keypair
import base64
from solana.publickey import PublicKey
import nacl.signing
from sentence_transformers import SentenceTransformer, util
import random
from transformers import pipeline
import logging

# Initialize logger
logger = logging.getLogger(__name__)

# Import wallet JWT authentication
from wallet_auth import get_current_user, require_nft_access, require_sol_balance
from auth_endpoints import auth_router
from documents_endpoints import router as documents_router
from doc_chat_endpoints import router as doc_chat_router
from websocket_auth import websocket_auth_manager, authenticate_websocket_connection
from message_models import ChatRoom, ChatMessage, RoomMember, MessageReaction, UserStatus, PrivateMessage
from redis_pubsub import redis_pubsub_manager, initialize_redis, cleanup_redis
from socratic_ai import trigger_socratic_ai
# Load environment variables
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")

# Initialize FastAPI app
app = FastAPI(title="Socratic")

# Include authentication router
app.include_router(auth_router)
app.include_router(documents_router)
app.include_router(doc_chat_router)

# FastAPI lifecycle events
@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    try:
        await initialize_redis()
        logger.info("Application startup completed successfully")
    except Exception as e:
        logger.error(f"Application startup failed: {str(e)}")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup services on shutdown"""
    try:
        await cleanup_redis()
        logger.info("Application shutdown completed successfully")
    except Exception as e:
        logger.error(f"Application shutdown error: {str(e)}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup SQLAlchemy engine and session
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Verify connections before use
    pool_recycle=300,    # Recycle connections every 5 minutes
    pool_size=10,        # Connection pool size
    max_overflow=20,     # Allow extra connections if needed
    echo=False           # Set to True for SQL debugging
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create database tables
Base.metadata.create_all(bind=engine)

# Old login endpoint removed - now using wallet JWT auth at /auth/* endpoints


@app.websocket("/ws/chat")
async def authenticated_websocket_chat(websocket: WebSocket):
    """
    JWT-authenticated WebSocket endpoint for real-time chat
    Supports token-gated rooms and NFT-based access control
    """
    import uuid
    connection_id = str(uuid.uuid4())
    
    try:
        # Authenticate the WebSocket connection
        user_data = await authenticate_websocket_connection(websocket)
        
        if not user_data:
            # Authentication failed - connection already closed by auth manager
            return
        
        # Add authenticated connection to manager
        websocket_auth_manager.add_connection(connection_id, websocket, user_data)
        
        # Send welcome message
        await websocket.send_text(json.dumps({
            "type": "welcome",
            "wallet_address": user_data["wallet_address"],
            "nft_holdings": user_data.get("nft_holdings", []),
            "message": "Connected to authenticated chat"
        }))
        
        # Message handling loop
        while True:
            try:
                message_text = await websocket.receive_text()
                message_data = json.loads(message_text)
                
                # Handle different message types
                await handle_websocket_message(connection_id, message_data, user_data)
                
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "Invalid JSON format"
                }))
            except Exception as e:
                logger.error(f"Error handling WebSocket message: {str(e)}")
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "Error processing message"
                }))
                
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {connection_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
    finally:
        # Clean up connection
        websocket_auth_manager.remove_connection(connection_id)


async def handle_websocket_message(connection_id: str, message_data: dict, user_data: dict):
    """
    Handle different types of WebSocket messages with database storage and Redis pub/sub
    """
    from datetime import datetime
    
    message_type = message_data.get("type")
    conn_data = websocket_auth_manager.get_connection(connection_id)
    
    if not conn_data:
        return
    
    websocket = conn_data["websocket"]
    wallet_address = user_data["wallet_address"]
    
    # Update user heartbeat
    await redis_pubsub_manager.set_user_heartbeat(wallet_address)
    
    # Get database session
    db = SessionLocal()
    
    try:
        if message_type == "heartbeat":
            # Heartbeat message to keep connection alive
            await websocket.send_text(json.dumps({
                "type": "heartbeat_ack",
                "timestamp": datetime.utcnow().isoformat(),
                "wallet_address": wallet_address
            }))
            
        elif message_type == "join_room":
            # Join a specific chat room
            room_id = message_data.get("room_id")
            if not room_id:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "Room ID required"
                }))
                return
            
            # Check if room exists and user has access
            room = db.query(ChatRoom).filter(ChatRoom.id == room_id).first()
            if not room:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "Room not found"
                }))
                return
            
            # Check NFT requirements if it's a gated room
            if room.room_type == "nft_gated" and room.required_nfts:
                user_nfts = user_data.get("nft_holdings", [])
                has_access = any(nft in user_nfts for nft in room.required_nfts)
                if not has_access:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": f"Access denied. Required NFTs: {room.required_nfts}"
                    }))
                    return
            
            # Add user to room if not already a member
            existing_member = db.query(RoomMember).filter(
                RoomMember.room_id == room_id,
                RoomMember.wallet_address == wallet_address
            ).first()
            
            if not existing_member:
                new_member = RoomMember(
                    room_id=room_id,
                    wallet_address=wallet_address,
                    role="member"
                )
                db.add(new_member)
                db.commit()
            
            # Subscribe to room channel
            await redis_pubsub_manager.subscribe_to_channel(
                f"room:{room_id}",
                lambda channel, data: websocket_message_callback(websocket, channel, data)
            )
            
            # Send recent messages
            recent_messages = await redis_pubsub_manager.get_recent_messages(str(room_id))
            await websocket.send_text(json.dumps({
                "type": "room_joined",
                "room_id": room_id,
                "room_name": room.name,
                "recent_messages": recent_messages
            }))
            
        elif message_type == "room_message":
            # Send message to a specific room
            room_id = message_data.get("room_id")
            content = message_data.get("message", "")
            
            if not room_id or not content:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "Room ID and message content required"
                }))
                return
            
            # Verify user is member of the room
            member = db.query(RoomMember).filter(
                RoomMember.room_id == room_id,
                RoomMember.wallet_address == wallet_address
            ).first()
            
            if not member or not member.can_send_messages:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "Not authorized to send messages in this room"
                }))
                return
            
            # Store message in database
            new_message = ChatMessage(
                room_id=room_id,
                content=content,
                sender_wallet=wallet_address,
                sender_nfts=user_data.get("nft_holdings", []),
                message_type="text"
            )
            db.add(new_message)
            db.commit()
            
            # Prepare message for broadcasting
            chat_message = {
                "type": "room_message",
                "message_id": new_message.id,
                "room_id": room_id,
                "wallet_address": wallet_address,
                "message": content,
                "timestamp": new_message.created_at.isoformat()
            }
            
            # Cache message in Redis
            await redis_pubsub_manager.store_message_cache(str(room_id), chat_message)
            
            # Publish to Redis for real-time delivery
            await redis_pubsub_manager.publish_chat_message(str(room_id), chat_message)
            
            # Update member stats
            member.message_count += 1
            member.last_seen = datetime.utcnow()
            db.commit()
            
            # Trigger Socratic AI agent for potential response
            try:
                # Get room info for context
                room = db.query(ChatRoom).filter(ChatRoom.id == room_id).first()
                
                # Prepare context for Socratic AI
                ai_context = {
                    'content': content,
                    'room_id': room_id,
                    'room_name': room.name if room else f'Room {room_id}',
                    'sender_wallet': wallet_address,
                    'sender_name': user_data.get('display_name', wallet_address[:8] + '...'),
                    'message_id': new_message.id,
                    'timestamp': new_message.created_at.isoformat(),
                    'nft_holdings': user_data.get('nft_holdings', [])
                }
                
                # Trigger Socratic AI processing asynchronously
                await trigger_socratic_ai(ai_context)
                
            except Exception as e:
                logger.error(f"Error triggering Socratic AI: {str(e)}")
                # Don't let AI errors affect message handling
            
        elif message_type == "private_message":
            # Send private message to specific wallet
            target_wallet = message_data.get("target_wallet")
            content = message_data.get("message", "")
            
            if not target_wallet or not content:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "Target wallet and message content required"
                }))
                return
            
            # Store private message in database
            private_msg = PrivateMessage(
                sender_wallet=wallet_address,
                recipient_wallet=target_wallet,
                content=content,
                message_type="text"
            )
            db.add(private_msg)
            db.commit()
            
            # Send to target wallet via WebSocket manager
            private_message = {
                "type": "private_message",
                "message_id": private_msg.id,
                "from_wallet": wallet_address,
                "message": content,
                "timestamp": private_msg.created_at.isoformat()
            }
            await websocket_auth_manager.broadcast_to_wallet(target_wallet, private_message)
            
            # Send confirmation to sender
            await websocket.send_text(json.dumps({
                "type": "message_sent",
                "message_id": private_msg.id,
                "target_wallet": target_wallet
            }))
            
        elif message_type == "get_online_users":
            # Get list of online users
            online_users = await redis_pubsub_manager.get_online_users()
            await websocket.send_text(json.dumps({
                "type": "online_users",
                "users": online_users,
                "count": len(online_users)
            }))
            
        elif message_type == "stats":
            # Get connection and user statistics
            websocket_stats = websocket_auth_manager.get_stats()
            online_users = await redis_pubsub_manager.get_online_users()
            
            await websocket.send_text(json.dumps({
                "type": "stats",
                "websocket_connections": websocket_stats,
                "online_users_count": len(online_users),
                "redis_connected": redis_pubsub_manager.is_connected
            }))
            
        else:
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": f"Unknown message type: {message_type}"
            }))
    
    except Exception as e:
        logger.error(f"Error handling WebSocket message: {str(e)}")
        await websocket.send_text(json.dumps({
            "type": "error",
            "message": "Internal server error"
        }))
    
    finally:
        db.close()


async def websocket_message_callback(websocket: WebSocket, channel: str, data: dict):
    """
    Callback for Redis pub/sub messages to forward to WebSocket
    """
    try:
        await websocket.send_text(json.dumps(data))
    except Exception as e:
        logger.error(f"Error forwarding Redis message to WebSocket: {str(e)}")


def get_db() -> Session:
    """Dependency to get DB session with proper error handling."""
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        print(f"Database session error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


class ChunkResponse(BaseModel):
    chunk_id: str
    text_snippet: str
    summary: str
    socratic_questions: List[str]
    page_number: Optional[int]
    filename: Optional[str]
    confidence: Optional[float]


class ChatRequest(BaseModel):
    message: str
    conversation_id: str = None


class ChatResponse(BaseModel):
    response: str
    conversation_id: str
    sources: List[str] = []


@app.post("/upload_doc/", response_model=dict)
async def upload_doc(file: UploadFile = File(...), db: Session = Depends(get_db)):
    validate_file_type(file)
    print("validated")
    upload_id = str(uuid_lib.uuid4())
    print("upload_id", upload_id)
    try:
        file_ext = os.path.splitext(file.filename)[-1].lower() if file.filename else ".tmp"
        if not file_ext:
            file_ext = ".tmp"
            
        with NamedTemporaryFile(delete=False, suffix=file_ext) as tmp:
            contents = await file.read()
            tmp.write(contents)
            tmp_path = tmp.name
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error saving file: {str(e)}")

    try:
        # Extract text using our multi-format loader
        documents = load_file_to_documents(tmp_path, file.filename)
        print("documents", documents)
        # Use intelligent structure-aware chunking
        structured_chunks = split_by_structure(documents)
        print("structured_chunks", structured_chunks)
        # Store upload metadata in database
        store_upload_metadata(upload_id, file.filename, len(structured_chunks), db)
        print("stored_upload_metadata")
        # Store temporary chunks for background processing
        store_temp_chunks(upload_id, structured_chunks, db)
        print("stored_temp_chunks")
        # Launch background processing task
        celery_app.send_task("tasks.process_chunks", args=[upload_id])
        print("launched_task")
        
        # Generate preview chunks with real summaries and questions
        preview_chunks = []
        for i, chunk in enumerate(structured_chunks[:3]):
            try:
                # Generate real summary and questions for preview
                summary, questions, confidence = get_summary_and_questions(chunk.page_content)
                preview_chunks.append({
                    "chunk_id": f"preview_{upload_id}_{i}",
                    "text_snippet": chunk.page_content[:300] + ("..." if len(chunk.page_content) > 300 else ""),
                    "summary": summary,
                    "socratic_questions": questions,
                    "filename": file.filename,
                    "page_number": chunk.metadata.get("page", i + 1),
                    "confidence": confidence
                })
            except Exception as e:
                print(f"Error generating preview for chunk {i}: {e}")
                # Fallback to placeholder if generation fails
                preview_chunks.append({
                    "chunk_id": f"preview_{upload_id}_{i}",
                    "text_snippet": chunk.page_content[:300] + ("..." if len(chunk.page_content) > 300 else ""),
                    "summary": "Preview generation in progress...",
                    "socratic_questions": ["Preview questions will be available shortly..."],
                    "filename": file.filename,
                    "page_number": chunk.metadata.get("page", i + 1),
                    "confidence": 0.5
                })

        # Clean up temp file
        os.unlink(tmp_path)
        
        return {
            "upload_id": upload_id,
            "status": "PROCESSING",
            "message": f"Successfully initiated processing of {file.filename}",
            "total_chunks": len(structured_chunks),
            "estimated_time": estimate_time_for_processing(len(structured_chunks)),
            "preview_chunks": preview_chunks,
            "file_type": file_ext.upper().replace(".", ""),
            "supported_operations": [
                "Text extraction",
                "Intelligent chunking", 
                "Socratic question generation",
                "Vector embedding",
                "Semantic search"
            ]
        }
        
    except Exception as e:
        # Clean up on error
        if 'tmp_path' in locals():
            os.unlink(tmp_path)
        raise HTTPException(
            status_code=500, detail=f"Error processing file: {str(e)}")


def estimate_time_for_processing(chunk_count: int) -> str:
    """Estimate processing time based on chunk count"""
    estimate_seconds = chunk_count * 3  # Assume 3 seconds per chunk
    if estimate_seconds < 60:
        return f"{estimate_seconds} seconds"
    elif estimate_seconds < 3600:
        minutes = estimate_seconds // 60
        return f"{minutes} minute{'s' if minutes != 1 else ''}"
    else:
        hours = estimate_seconds // 3600
        minutes = (estimate_seconds % 3600) // 60
        return f"{hours}h {minutes}m"


@app.post("/upload_doc/abort/{upload_id}")
def abort_upload(upload_id: str, db: Session = Depends(get_db)):
    try:
        upload_uuid = uuid_lib.UUID(upload_id)
        upload = db.query(PdfUploads).filter(PdfUploads.id == upload_uuid).first()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid upload ID format")
    
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")

    upload.status = "ABORTED"
    db.commit()
    return {"message": "Upload aborted"}


@app.post("/chat/", response_model=ChatResponse)
async def chat_with_context(request: ChatRequest, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """
    Chat endpoint that uses the vector store to provide context-aware responses
    based on uploaded PDFs.
    """
    try:
        # Setup embeddings for similarity search
        embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2")
        vectorstore = PGVector(
            connection_string=DATABASE_URL,
            embedding_function=embeddings,
            collection_name="pdf_chunks",
        )

        # Search for relevant context from uploaded PDFs
        relevant_docs = vectorstore.similarity_search(
            request.message,
            k=3  # Get top 3 most relevant chunks
        )

        # Prepare context from relevant documents
        context = ""
        sources = []
        if relevant_docs:
            context = "\n\nRelevant context from uploaded documents:\n"
            for i, doc in enumerate(relevant_docs, 1):
                context += f"{i}. {doc.page_content[:500]}...\n"
                sources.append(f"Document chunk {i}")

        llm = ChatOpenAI(
            model="mistralai/Mistral-7B-Instruct-v0.2",
            temperature=0.7,
            api_key=os.getenv("OPENAI_API_KEY"),
            base_url=os.getenv("OPENAI_API_BASE")
        )

        # Create a comprehensive prompt
        prompt = f"""You are a helpful AI assistant with access to uploaded document content. 
        Answer the user's question using the provided context when relevant. 
        If the context doesn't contain relevant information, provide a general helpful response.
        
        User Question: {request.message}
        {context}
        
        Please provide a clear, helpful response. If you used information from the uploaded documents, 
        mention that you're referencing the uploaded content."""

        # Get response from LLM
        response = await llm.ainvoke(prompt)

        # Generate conversation ID if not provided
        conversation_id = request.conversation_id or str(uuid_lib.uuid4())

        return ChatResponse(
            response=response.content,
            conversation_id=conversation_id,
            sources=sources
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")


@app.get("/health")
async def health_check():
    """Simple health check endpoint"""
    return {"status": "healthy", "message": "PDF Socratic LLM Processor is running"}


def load_file_to_documents(file_path: str, filename: str) -> List[Document]:
    ext = os.path.splitext(filename)[-1].lower()

    if ext == ".pdf":
        return load_pdf_with_pymupdf(file_path, filename)
    elif ext in [".csv", ".xlsx", ".xls"]:
        return load_spreadsheet(file_path, filename)
    elif ext == ".md":
        return load_markdown(file_path, filename)
    else:
        raise ValueError("Unsupported file format")


def load_pdf_with_pymupdf(file_path: str, filename: str) -> List[Document]:
    doc = fitz.open(file_path)
    documents = []
    for i, page in enumerate(doc):
        text = page.get_text("text")  # gets text even from OCR-scanned PDFs
        if not text.strip():
            continue
        metadata = {"source": filename, "page": i + 1}
        documents.append(Document(page_content=text, metadata=metadata))
    return documents


def load_spreadsheet(file_path: str, filename: str) -> List[Document]:
    try:
        if filename.endswith(".csv"):
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)
    except Exception as e:
        raise ValueError(f"Error loading spreadsheet: {e}")

    content = df.to_string(index=False)
    return [Document(page_content=content, metadata={"source": filename})]


def load_markdown(file_path: str, filename: str) -> List[Document]:
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
    except Exception as e:
        raise ValueError(f"Error reading markdown file: {e}")
    return [Document(page_content=content, metadata={"source": filename})]


def validate_file_type(file: UploadFile):
    # Read a sample of the file to determine MIME type
    file_content = file.file.read(2048)
    file.file.seek(0)  # Reset file pointer
    
    mime_type = magic.from_buffer(file_content, mime=True)
    
    allowed_types = [
        'application/pdf',
        'text/csv',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',  # .xlsx
        'application/vnd.ms-excel',  # .xls
        'text/markdown',
        'text/plain'  # for .md files that might be detected as plain text
    ]
    
    # Additional check for file extension if MIME type is not conclusive
    if file.filename:
        file_ext = os.path.splitext(file.filename)[-1].lower()
        if file_ext in ['.md', '.markdown'] and mime_type in ['text/plain', 'text/markdown']:
            return  # Allow markdown files
        elif file_ext in ['.csv'] and mime_type in ['text/plain', 'text/csv']:
            return  # Allow CSV files
        elif file_ext in ['.xlsx', '.xls'] and 'spreadsheet' in mime_type.lower():
            return  # Allow Excel files
        elif file_ext == '.pdf' and mime_type == 'application/pdf':
            return  # Allow PDF files
    
    if mime_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file type. Detected MIME type: {mime_type}. Supported types: PDF, CSV, Excel (.xlsx/.xls), Markdown (.md)"
        )


def split_by_structure(documents: List[Document]) -> List[Document]:
    text = "\n".join([doc.page_content for doc in documents])
    if text.count("CHAPTER") > 2 or "Table of Contents" in text:
        return split_into_chapters(text)
    else:
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=4000, chunk_overlap=200)
        return splitter.split_documents(documents)


def split_into_chapters(text: str) -> List[Document]:
    # Look for patterns like "CHAPTER 1", "Chapter One", etc.
    chapter_regex = re.compile(
        r"(CHAPTER\s+\d+|Chapter\s+[A-Z][a-z]+)", re.IGNORECASE)
    parts = chapter_regex.split(text)

    documents = []
    for i in range(1, len(parts), 2):  # Skip the first non-matching part
        title = parts[i].strip()
        content = parts[i + 1].strip() if i + 1 < len(parts) else ""
        full_text = f"{title}\n\n{content}"
        documents.append(Document(page_content=full_text,
                         metadata={"section": title}))

    return documents


def store_temp_chunks(upload_id: str, chunks: List[Document], db: Session):
    upload_uuid = uuid_lib.UUID(upload_id) if isinstance(upload_id, str) else upload_id
    print("----")
    print("upload_uuid", upload_uuid)
    for idx, doc in enumerate(chunks):
        chunk_uuid = uuid_lib.uuid4()
        temp = TempChunks(
            upload_id=upload_uuid,
            chunk_id=chunk_uuid,
            chunk_index=idx,
            text_=doc.page_content,
            page_number=doc.metadata.get("page", idx + 1),
            section=doc.metadata.get("section", "")
        )
        db.add(temp)
    db.commit()


def store_upload_metadata(upload_id: str, filename: str, total_chunks: int, db: Session):
    upload_uuid = uuid_lib.UUID(upload_id) if isinstance(upload_id, str) else upload_id
    upload = PdfUploads(
        id=upload_uuid,
        filename=filename,
        total_chunks=total_chunks,
        status="PROCESSING"
    )
    db.add(upload)
    db.commit()


def estimate_time(upload) -> str:
    remaining = upload.total_chunks - upload.processed_chunks
    estimate = remaining * 3  # assume 3 sec per chunk
    if estimate < 60:
        return f"{estimate} seconds"
    else:
        return f"{estimate // 60}–{(estimate + 59) // 60} mins"


def get_summary_and_questions(text: str) -> Tuple[str, List[str], float]:
    """
    Generate a summary and Socratic questions for a given text chunk.
    Returns a tuple of (summary, questions_list, confidence_score)
    """
    try:
        # Limit text length to avoid token limits
        text_snippet = text[:2000] if len(text) > 2000 else text
        
        prompt = (
            f"Analyze this text and provide:\n\n"
            f"Text: {text_snippet}\n\n"
            f"Format your response exactly as follows:\n"
            f"SUMMARY: [One clear sentence summarizing the main point]\n"
            f"QUESTION 1: [First Socratic question]\n"
            f"QUESTION 2: [Second Socratic question]\n"
            f"QUESTION 3: [Third Socratic question (optional)]\n\n"
            f"Make the questions thought-provoking and open-ended to encourage deeper thinking."
        )
        
        llm = ChatOpenAI(
            model="mistralai/Mistral-7B-Instruct-v0.2",
            temperature=0.7,
            api_key=os.getenv("OPENAI_API_KEY"),
            base_url=os.getenv("OPENAI_API_BASE"),
            timeout=30  # Add timeout to prevent hanging
        )
        
        response = llm.invoke(prompt).content.strip()
        
        # Parse the structured response
        summary = ""
        questions = []
        confidence = 0.8
        
        lines = response.split('\n')
        for line in lines:
            line = line.strip()
            if line.startswith("SUMMARY:"):
                summary = line.replace("SUMMARY:", "").strip()
            elif line.startswith("QUESTION"):
                question_text = line.split(":", 1)[-1].strip()
                if question_text and not question_text.startswith("[") and not question_text.endswith("]"):
                    questions.append(question_text)
        
        # Fallback parsing if structured format wasn't followed
        if not summary or not questions:
            response_lines = [line.strip() for line in response.split('\n') if line.strip()]
            if response_lines:
                summary = summary or response_lines[0]
                # Extract questions from remaining lines
                for line in response_lines[1:]:
                    if ('?' in line and len(line) > 10 and 
                        not line.lower().startswith('summary') and
                        not line.startswith('QUESTION')):
                        clean_question = line.strip('- •').strip()
                        if clean_question:
                            questions.append(clean_question)
        
        # Ensure we have reasonable output
        if not summary:
            summary = f"This text discusses {text_snippet[:100]}..."
            confidence = 0.3
        
        if not questions:
            questions = [
                "What are the key implications of this content?",
                "How might this information be applied in practice?",
                "What questions does this text raise for further exploration?"
            ]
            confidence = min(confidence, 0.4)
        
        # Limit to 3 questions max
        questions = questions[:3]
        
        return summary, questions, confidence
        
    except Exception as e:
        print(f"Error in get_summary_and_questions: {e}")
        # Return fallback values
        fallback_summary = f"Analysis of text content ({len(text)} characters)"
        fallback_questions = [
            "What are the main concepts presented in this text?",
            "How does this information relate to broader themes?",
            "What implications or applications can be drawn from this content?"
        ]
        return fallback_summary, fallback_questions, 0.2


@app.get("/upload_status/{upload_id}")
def get_upload_status(upload_id: str, db: Session = Depends(get_db)):
    """Get the current processing status of an upload with comprehensive information"""
    try:
        upload_uuid = uuid_lib.UUID(upload_id)
        upload = db.query(PdfUploads).filter(PdfUploads.id == upload_uuid).first()
        print("upload", upload)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid upload ID format")
    
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")

    # Calculate progress percentage
    progress = 0
    if upload.total_chunks > 0:
        progress = int((upload.processed_chunks / upload.total_chunks) * 100)
    
    # Determine processing stage and message
    processing_stage = "Initializing..."
    detailed_message = f"Processed {upload.processed_chunks} of {upload.total_chunks} chunks"
    
    if upload.status == "PROCESSING":
        if progress < 10:
            processing_stage = "Extracting text and creating chunks..."
        elif progress < 50:
            processing_stage = "Generating summaries and Socratic questions..."
        elif progress < 90:
            processing_stage = "Creating embeddings and storing results..."
        else:
            processing_stage = "Finalizing processing..."
    elif upload.status == "COMPLETED":
        processing_stage = "Processing complete!"
        detailed_message = f"Successfully processed all {upload.total_chunks} chunks"
    elif upload.status == "FAILED":
        processing_stage = "Processing failed"
        detailed_message = f"Processing failed at chunk {upload.processed_chunks} of {upload.total_chunks}"
    elif upload.status == "ABORTED":
        processing_stage = "Processing aborted"
        detailed_message = f"Processing was aborted at chunk {upload.processed_chunks} of {upload.total_chunks}"

    # Calculate estimated time remaining
    estimated_time_remaining = "N/A"
    if upload.status == "PROCESSING" and upload.total_chunks > upload.processed_chunks:
        remaining_chunks = upload.total_chunks - upload.processed_chunks
        estimated_seconds = remaining_chunks * 3  # 3 seconds per chunk estimate
        if estimated_seconds < 60:
            estimated_time_remaining = f"{estimated_seconds} seconds"
        elif estimated_seconds < 3600:
            minutes = estimated_seconds // 60
            estimated_time_remaining = f"{minutes} minute{'s' if minutes != 1 else ''}"
        else:
            hours = estimated_seconds // 3600
            minutes = (estimated_seconds % 3600) // 60
            estimated_time_remaining = f"{hours}h {minutes}m"

    return {
        "upload_id": upload_id,
        "status": upload.status,
        "progress": progress,
        "message": detailed_message,
        "processing_stage": processing_stage,
        "processed_chunks": upload.processed_chunks,
        "total_chunks": upload.total_chunks,
        "estimated_time_remaining": estimated_time_remaining,
        "filename": upload.filename,
        "created_at": upload.created_at.isoformat() if upload.created_at else None,
        "error_log": upload.error_log
    }


@app.get("/preview_chunks/{upload_id}")
def get_preview_chunks(upload_id: str, db: Session = Depends(get_db)):
    """Get preview chunks with real-time summary and question generation for an upload"""
    try:
        upload_uuid = uuid_lib.UUID(upload_id)
        
        # Get upload info
        upload = db.query(PdfUploads).filter(PdfUploads.id == upload_uuid).first()
        if not upload:
            raise HTTPException(status_code=404, detail="Upload not found")
        
        # Get first 3 temp chunks for preview
        temp_chunks = db.query(TempChunks).filter(
            TempChunks.upload_id == upload_uuid
        ).order_by(TempChunks.chunk_index).limit(3).all()
        
        preview_chunks = []
        for i, chunk in enumerate(temp_chunks):
            try:
                # Generate real-time summary and questions
                summary, questions, confidence = get_summary_and_questions(chunk.text_)
                preview_chunks.append({
                    "chunk_id": f"preview_{upload_id}_{i}",
                    "text_snippet": chunk.text_[:300] + ("..." if len(chunk.text_) > 300 else ""),
                    "summary": summary,
                    "socratic_questions": questions,
                    "filename": upload.filename,
                    "page_number": chunk.page_number or (i + 1),
                    "confidence": confidence
                })
            except Exception as e:
                print(f"Error generating preview for chunk {i}: {e}")
                # Fallback preview
                preview_chunks.append({
                    "chunk_id": f"preview_{upload_id}_{i}",
                    "text_snippet": chunk.text_[:300] + ("..." if len(chunk.text_) > 300 else ""),
                    "summary": "Preview generation in progress...",
                    "socratic_questions": ["Preview questions will be available shortly..."],
                    "filename": upload.filename,
                    "page_number": chunk.page_number or (i + 1),
                    "confidence": 0.5
                })
        
        return {
            "upload_id": upload_id,
            "status": upload.status,
            "preview_chunks": preview_chunks,
            "total_available": len(temp_chunks)
        }
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid upload ID format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving preview chunks: {str(e)}")


@app.get("/final_chunks/{upload_id}")
def get_final_chunks(upload_id: str, db: Session = Depends(get_db)):
    """Get the final processed chunks for an upload"""
    try:
        upload_uuid = uuid_lib.UUID(upload_id)
        
        # Get upload info
        upload = db.query(PdfUploads).filter(PdfUploads.id == upload_uuid).first()
        if not upload:
            raise HTTPException(status_code=404, detail="Upload not found")
        
        # Get final chunks
        final_chunks = db.query(FinalChunks).filter(FinalChunks.upload_id == str(upload_uuid)).all()
        
        chunks_response = []
        for chunk in final_chunks:
            # Ensure socratic_questions is always a list
            questions = chunk.socratic_questions
            if isinstance(questions, str):
                # If it's a string, try to parse it or split it
                try:
                    import json
                    questions = json.loads(questions)
                except:
                    questions = [q.strip() for q in questions.split('\n') if q.strip()]
            elif not isinstance(questions, list):
                questions = []
            
            chunks_response.append({
                "chunk_id": str(chunk.id),
                "text_snippet": chunk.text_snippet,
                "summary": chunk.summary or "Summary not available",
                "socratic_questions": questions,
                "filename": upload.filename,
                "page_number": chunk.page_number or 1,
                "confidence": chunk.confidence or 0.8
            })
        
        return {
            "upload_id": upload_id,
            "status": upload.status,
            "chunks": chunks_response,
            "total_chunks": len(chunks_response)
        }
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid upload ID format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving chunks: {str(e)}")


@app.get("/chunks/{upload_id}")
def get_chunks(upload_id: str, include_preview: bool = True, db: Session = Depends(get_db)):
    """
    Unified endpoint to get chunks for an upload.
    Returns preview chunks for processing uploads, final chunks for completed uploads.
    """
    try:
        upload_uuid = uuid_lib.UUID(upload_id)
        
        # Get upload info
        upload = db.query(PdfUploads).filter(PdfUploads.id == upload_uuid).first()
        if not upload:
            raise HTTPException(status_code=404, detail="Upload not found")
        
        chunks_response = []
        total_chunks = 0
        
        if upload.status == "COMPLETED":
            # Get final processed chunks
            final_chunks = db.query(FinalChunks).filter(FinalChunks.upload_id == str(upload_uuid)).all()
            
            for chunk in final_chunks:
                # Ensure socratic_questions is always a list
                questions = chunk.socratic_questions
                if isinstance(questions, str):
                    try:
                        import json
                        questions = json.loads(questions)
                    except:
                        questions = [q.strip() for q in questions.split('\n') if q.strip()]
                elif not isinstance(questions, list):
                    questions = []
                
                chunks_response.append({
                    "chunk_id": str(chunk.id),
                    "text_snippet": chunk.text_snippet,
                    "summary": chunk.summary or "Summary not available",
                    "socratic_questions": questions,
                    "filename": upload.filename,
                    "page_number": chunk.page_number or 1,
                    "confidence": chunk.confidence or 0.8,
                    "type": "final"
                })
            
            total_chunks = len(final_chunks)
            
        elif upload.status in ["PROCESSING", "PENDING"] and include_preview:
            # Get preview chunks from temp data
            temp_chunks = db.query(TempChunks).filter(
                TempChunks.upload_id == upload_uuid
            ).order_by(TempChunks.chunk_index).limit(5).all()  # Show up to 5 preview chunks
            
            for i, chunk in enumerate(temp_chunks):
                try:
                    # Generate real-time summary and questions for preview
                    summary, questions, confidence = get_summary_and_questions(chunk.text_)
                    chunks_response.append({
                        "chunk_id": f"preview_{upload_id}_{i}",
                        "text_snippet": chunk.text_[:300] + ("..." if len(chunk.text_) > 300 else ""),
                        "summary": summary,
                        "socratic_questions": questions,
                        "filename": upload.filename,
                        "page_number": chunk.page_number or (i + 1),
                        "confidence": confidence,
                        "type": "preview"
                    })
                except Exception as e:
                    print(f"Error generating preview for chunk {i}: {e}")
                    # Fallback preview
                    chunks_response.append({
                        "chunk_id": f"preview_{upload_id}_{i}",
                        "text_snippet": chunk.text_[:300] + ("..." if len(chunk.text_) > 300 else ""),
                        "summary": "Preview generation in progress...",
                        "socratic_questions": ["Preview questions will be available shortly..."],
                        "filename": upload.filename,
                        "page_number": chunk.page_number or (i + 1),
                        "confidence": 0.5,
                        "type": "preview"
                    })
            
            total_chunks = len(temp_chunks)
        
        # Calculate progress for additional context
        progress = 0
        if upload.total_chunks > 0:
            progress = int((upload.processed_chunks / upload.total_chunks) * 100)
        
        return {
            "upload_id": upload_id,
            "status": upload.status,
            "chunks": chunks_response,
            "total_chunks": total_chunks,
            "total_expected": upload.total_chunks,
            "processed_chunks": upload.processed_chunks,
            "progress": progress,
            "filename": upload.filename,
            "chunk_type": "final" if upload.status == "COMPLETED" else "preview",
            "has_more": upload.status == "PROCESSING" and len(chunks_response) < upload.total_chunks
        }
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid upload ID format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving chunks: {str(e)}")


@app.post("/debug/process_chunks/{upload_id}")
def debug_process_chunks(upload_id: str, db: Session = Depends(get_db)):
    """Debug endpoint to manually trigger process_chunks task"""
    try:
        # Verify upload exists
        upload_uuid = uuid_lib.UUID(upload_id)
        upload = db.query(PdfUploads).filter(PdfUploads.id == upload_uuid).first()
        if not upload:
            raise HTTPException(status_code=404, detail="Upload not found")
        
        # Try to send the task
        task = celery_app.send_task("tasks.process_chunks", args=[upload_id])
        
        return {
            "message": "Task sent successfully",
            "task_id": task.id,
            "upload_id": upload_id,
            "upload_status": upload.status,
            "celery_broker": os.getenv("CELERY_BROKER_URL"),
            "celery_backend": os.getenv("CELERY_RESULT_BACKEND")
        }
    except Exception as e:
        return {
            "error": str(e),
            "upload_id": upload_id,
            "celery_broker": os.getenv("CELERY_BROKER_URL"),
            "celery_backend": os.getenv("CELERY_RESULT_BACKEND")
        }


class RecommendationRequest(BaseModel):
    user_id: str
    top_k: int = 5

class BookRecommendation(BaseModel):
    id: str
    title: str
    author: str
    description: str

@app.post("/recommendations", response_model=List[BookRecommendation])
async def get_recommendations(request: RecommendationRequest, db: Session = Depends(get_db)):
    """
    Recommend books for a user using collaborative/content-based filtering.
    If user has no history, return random/popular books.
    """
    user_id = request.user_id
    top_k = request.top_k

    # Get all books (PDF uploads)
    books = db.query(PdfUploads).all()
    if not books:
        return []

    # Try to get user's uploaded books (as history)
    user_books = db.query(PdfUploads).filter(PdfUploads.user_id == user_id).all()
    if user_books:
        # Content-based: recommend similar books based on title/description
        model = SentenceTransformer('all-MiniLM-L6-v2')
        user_texts = [b.filename for b in user_books]
        all_texts = [b.filename for b in books]
        all_ids = [str(b.id) for b in books]
        all_authors = ["Unknown" for _ in books]  # Placeholder, update if author field exists
        all_descs = ["" for _ in books]  # Placeholder, update if description field exists

        # Embed all book titles
        all_embs = model.encode(all_texts, convert_to_tensor=True)
        user_embs = model.encode(user_texts, convert_to_tensor=True)
        # Average user embeddings
        user_profile = user_embs.mean(dim=0, keepdim=True)
        # Compute similarity
        scores = util.pytorch_cos_sim(user_profile, all_embs)[0]
        # Get top_k indices
        top_indices = scores.argsort(descending=True)[:top_k].tolist()
        recommendations = []
        for idx in top_indices:
            recommendations.append(BookRecommendation(
                id=all_ids[idx],
                title=all_texts[idx],
                author=all_authors[idx],
                description=all_descs[idx]
            ))
        return recommendations
    else:
        # No user history: return random books
        sample_books = random.sample(books, min(top_k, len(books)))
        return [BookRecommendation(
            id=str(b.id),
            title=b.filename,
            author="Unknown",
            description=""
        ) for b in sample_books]


class SearchRequest(BaseModel):
    query: str
    top_k: int = 5

@app.post("/search", response_model=List[BookRecommendation])
async def search_books(request: SearchRequest, db: Session = Depends(get_db)):
    """
    Semantic search for books using natural language queries.
    """
    query = request.query
    top_k = request.top_k
    books = db.query(PdfUploads).all()
    if not books:
        return []
    model = SentenceTransformer('all-MiniLM-L6-v2')
    book_titles = [b.filename for b in books]
    all_ids = [str(b.id) for b in books]
    all_authors = ["Unknown" for _ in books]
    all_descs = ["" for _ in books]
    book_embs = model.encode(book_titles, convert_to_tensor=True)
    query_emb = model.encode([query], convert_to_tensor=True)[0]
    scores = util.pytorch_cos_sim(query_emb, book_embs)[0]
    top_indices = scores.argsort(descending=True)[:top_k].tolist()
    results = []
    for idx in top_indices:
        results.append(BookRecommendation(
            id=all_ids[idx],
            title=book_titles[idx],
            author=all_authors[idx],
            description=all_descs[idx]
        ))
    return results


class SummarizeRequest(BaseModel):
    book_id: str

class SummaryResponse(BaseModel):
    summary: str

@app.post("/summarize", response_model=SummaryResponse)
async def summarize_book(request: SummarizeRequest, db: Session = Depends(get_db)):
    """
    Generate an AI summary for a book using its filename/content.
    """
    book = db.query(PdfUploads).filter(PdfUploads.id == request.book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    # Use filename as a proxy for content (replace with actual content if available)
    text = book.filename
    try:
        from langchain_openai import ChatOpenAI
        llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0.5, api_key=os.getenv("OPENAI_API_KEY"))
        prompt = f"Summarize the following book in 3-4 sentences.\n\nBook: {text}"
        summary = llm.invoke(prompt).content.strip()
    except Exception as e:
        summary = f"Summary not available. Error: {e}"
    return SummaryResponse(summary=summary)


class SentimentRequest(BaseModel):
    text: str

class SentimentResponse(BaseModel):
    label: str
    score: float

@app.post("/sentiment", response_model=SentimentResponse)
async def analyze_sentiment(request: SentimentRequest):
    """
    Analyze sentiment of a review using transformers pipeline.
    """
    try:
        sentiment_pipeline = pipeline("sentiment-analysis")
        result = sentiment_pipeline(request.text)[0]
        label = result["label"].lower()
        score = float(result["score"])
        # Map labels to positive/negative/neutral if needed
        if label.startswith("pos"):
            label = "positive"
        elif label.startswith("neg"):
            label = "negative"
        else:
            label = "neutral"
    except Exception as e:
        label = "unknown"
        score = 0.0
    return SentimentResponse(label=label, score=score)


class ChatbotRequest(BaseModel):
    message: str

class ChatbotResponse(BaseModel):
    response: str

@app.post("/chatbot", response_model=ChatbotResponse)
async def chatbot(request: ChatbotRequest, db: Session = Depends(get_db)):
    """
    AI chatbot assistant for book-related queries.
    """
    user_message = request.message
    # Optionally, fetch book data for context
    books = db.query(PdfUploads).all()
    book_titles = [b.filename for b in books]
    context = f"Available books: {', '.join(book_titles[:10])}..." if books else "No books available."
    try:
        from langchain_openai import ChatOpenAI
        llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0.7, api_key=os.getenv("OPENAI_API_KEY"))
        prompt = f"You are a helpful book catalog assistant. {context}\n\nUser: {user_message}\nAssistant:"
        response = llm.invoke(prompt).content.strip()
    except Exception as e:
        response = f"Sorry, I couldn't process your request. Error: {e}"
    return ChatbotResponse(response=response)


class PersonalizedRequest(BaseModel):
    user_id: str
    top_k: int = 5

@app.post("/personalized", response_model=List[BookRecommendation])
async def get_personalized_list(request: PersonalizedRequest, db: Session = Depends(get_db)):
    """
    Return a personalized list of books for a user (currently same as recommendations).
    """
    user_id = request.user_id
    top_k = request.top_k
    # For now, use the same logic as recommendations
    books = db.query(PdfUploads).all()
    if not books:
        return []
    user_books = db.query(PdfUploads).filter(PdfUploads.user_id == user_id).all()
    if user_books:
        from sentence_transformers import SentenceTransformer, util
        model = SentenceTransformer('all-MiniLM-L6-v2')
        user_texts = [b.filename for b in user_books]
        all_texts = [b.filename for b in books]
        all_ids = [str(b.id) for b in books]
        all_authors = ["Unknown" for _ in books]
        all_descs = ["" for _ in books]
        all_embs = model.encode(all_texts, convert_to_tensor=True)
        user_embs = model.encode(user_texts, convert_to_tensor=True)
        user_profile = user_embs.mean(dim=0, keepdim=True)
        scores = util.pytorch_cos_sim(user_profile, all_embs)[0]
        top_indices = scores.argsort(descending=True)[:top_k].tolist()
        personalized = []
        for idx in top_indices:
            personalized.append(BookRecommendation(
                id=all_ids[idx],
                title=all_texts[idx],
                author=all_authors[idx],
                description=all_descs[idx]
            ))
        return personalized
    else:
        import random
        sample_books = random.sample(books, min(top_k, len(books)))
        return [BookRecommendation(
            id=str(b.id),
            title=b.filename,
            author="Unknown",
            description=""
        ) for b in sample_books]


class TagRequest(BaseModel):
    book_id: str

class TagResponse(BaseModel):
    tags: list[str]

@app.post("/tag", response_model=TagResponse)
async def tag_book(request: TagRequest, db: Session = Depends(get_db)):
    """
    AI-powered tagging for books using zero-shot classification.
    """
    book = db.query(PdfUploads).filter(PdfUploads.id == request.book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    # Use filename as a proxy for content (replace with actual content if available)
    text = book.filename
    try:
        from transformers import pipeline
        classifier = pipeline("zero-shot-classification")
        candidate_labels = ["Fiction", "Non-Fiction", "Science Fiction", "Fantasy", "Mystery", "Biography", "Self-Help", "Philosophy", "History", "Romance", "Thriller", "Memoir"]
        result = classifier(text, candidate_labels)
        tags = [label for label, score in zip(result["labels"], result["scores"]) if score > 0.3]
    except Exception as e:
        tags = [f"Tagging error: {e}"]
    return TagResponse(tags=tags)
