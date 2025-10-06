from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from .main import get_db
from solana import StudyRoomContract

router = APIRouter(prefix="/rooms", tags=["study-rooms"])

class CreateRoomRequest(BaseModel):
    room_name: str
    is_public: bool

@router.post("/create")
async def create_room(request: CreateRoomRequest, db: Session = Depends(get_db)):
    """Create a new study room."""
    try:
        contract = StudyRoomContract()
        contract.create_room(request.room_name, request.is_public)
        return {"message": "Room created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error creating room")

@router.post("/mint-nft/{room_id}")
async def mint_room_nft(room_id: int, db: Session = Depends(get_db)):
    """Mint an NFT for a study room."""
    try:
        contract = StudyRoomContract()
        contract.mint_room_nft(room_id)
        return {"message": "NFT minted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error minting NFT")
