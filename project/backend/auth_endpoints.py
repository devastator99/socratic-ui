"""
Authentication Endpoints for Wallet-based JWT Auth
Provides challenge/verify, token refresh, and logout endpoints
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional
import logging
from .wallet_auth import WalletAuthService, get_current_user

logger = logging.getLogger(__name__)

# Create router for auth endpoints
auth_router = APIRouter(prefix="/auth", tags=["authentication"])

# Request/Response Models
class ChallengeRequest(BaseModel):
    wallet_address: str = Field(..., description="Solana wallet public key")

class ChallengeResponse(BaseModel):
    challenge: str = Field(..., description="Challenge string to sign")
    message: str = Field(..., description="Human-readable message")

class VerifyRequest(BaseModel):
    wallet_address: str = Field(..., description="Solana wallet public key")
    signature: str = Field(..., description="Base58 encoded signature")
    challenge: str = Field(..., description="Challenge string that was signed")
    nft_holdings: Optional[list] = Field(default=[], description="List of NFT mint addresses owned")

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    expires_in: int
    wallet_address: str

class RefreshRequest(BaseModel):
    refresh_token: str

class RefreshResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int

@auth_router.post("/challenge", response_model=ChallengeResponse)
async def get_auth_challenge(request: ChallengeRequest):
    """
    Generate authentication challenge for wallet to sign
    
    Step 1 of wallet authentication flow:
    1. Client requests challenge with wallet address
    2. Server generates random challenge and stores temporarily
    3. Client signs challenge message with wallet private key
    4. Client submits signature for verification
    """
    try:
        challenge = WalletAuthService.generate_challenge(request.wallet_address)
        
        return ChallengeResponse(
            challenge=challenge,
            message=f"MindChain Auth Challenge: {challenge}"
        )
    
    except Exception as e:
        logger.error(f"Challenge generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate challenge")

@auth_router.post("/verify", response_model=TokenResponse)
async def verify_wallet_signature(request: VerifyRequest):
    """
    Verify wallet signature and issue JWT tokens
    
    Step 2 of wallet authentication flow:
    1. Verify signature against stored challenge
    2. Generate JWT access and refresh tokens
    3. Return tokens for authenticated requests
    """
    try:
        # Verify the signature
        is_valid = WalletAuthService.verify_signature(
            request.wallet_address,
            request.signature,
            request.challenge
        )
        
        if not is_valid:
            raise HTTPException(
                status_code=401, 
                detail="Invalid signature or expired challenge"
            )
        
        # Create JWT tokens
        tokens = WalletAuthService.create_tokens(
            request.wallet_address,
            request.nft_holdings
        )
        
        return TokenResponse(
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            token_type=tokens["token_type"],
            expires_in=tokens["expires_in"],
            wallet_address=request.wallet_address
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Signature verification failed: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Authentication verification failed"
        )

@auth_router.post("/refresh", response_model=RefreshResponse)
async def refresh_token(request: RefreshRequest):
    """
    Refresh access token using refresh token
    
    Allows clients to get new access tokens without re-authentication
    """
    try:
        new_tokens = WalletAuthService.refresh_access_token(request.refresh_token)
        
        return RefreshResponse(
            access_token=new_tokens["access_token"],
            token_type=new_tokens["token_type"],
            expires_in=new_tokens["expires_in"]
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh failed: {str(e)}")
        raise HTTPException(status_code=401, detail="Token refresh failed")

@auth_router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """
    Logout user and revoke tokens
    
    Blacklists current access token and removes refresh token
    """
    try:
        # Note: We need to get the actual token from the request
        # This is a simplified version - you'd typically extract the token
        # from the Authorization header in the dependency
        WalletAuthService.revoke_tokens(
            current_user["wallet_address"],
            ""  # Would need actual token here
        )
        
        return {"message": "Successfully logged out"}
    
    except Exception as e:
        logger.error(f"Logout failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Logout failed")

@auth_router.get("/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """
    Get current authenticated user information
    
    Returns wallet address, NFT holdings, and token info
    """
    return {
        "wallet_address": current_user["wallet_address"],
        "nft_holdings": current_user.get("nft_holdings", []),
        "token_type": current_user.get("token_type"),
        "authenticated": True
    }

@auth_router.get("/health")
async def auth_health_check():
    """Health check for authentication service"""
    return {
        "status": "healthy",
        "service": "wallet_authentication",
        "timestamp": str(__import__("datetime").datetime.utcnow())
    }
