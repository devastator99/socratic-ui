from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from .main import get_db

router = APIRouter(prefix="/wallet", tags=["wallet"])

@router.post("/connect")
async def connect_wallet(wallet_address: str, db: Session = Depends(get_db)):
    """Connect a user's wallet."""
    # Logic to connect wallet
    return {"message": "Wallet connected successfully"}

@router.post("/siws")
async def siws_authenticate(wallet_address: str, signature: str, db: Session = Depends(get_db)):
    """Authenticate user using SIWS."""
    # Logic to verify SIWS signature
    return {"message": "Authenticated successfully"}
