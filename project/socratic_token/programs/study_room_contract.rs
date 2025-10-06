// Smart contract for study room management

use anchor_lang::prelude::*;

#[program]
pub mod study_room_contract {
    use super::*;

    pub fn create_room(ctx: Context<CreateRoom>, room_name: String, is_public: bool) -> Result<()> {
        let room = &mut ctx.accounts.room;
        room.owner = *ctx.accounts.owner.key;
        room.name = room_name;
        room.is_public = is_public;
        Ok(())
    }

    pub fn mint_room_nft(ctx: Context<MintRoomNFT>, room_id: u64) -> Result<()> {
        // Logic for minting NFT for the room
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateRoom<'info> {
    #[account(init, payer = owner, space = 8 + 32 + 32 + 1)]
    pub room: Account<'info, StudyRoom>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MintRoomNFT<'info> {
    #[account(mut)]
    pub room: Account<'info, StudyRoom>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct StudyRoom {
    pub owner: Pubkey,
    pub name: String,
    pub is_public: bool,
}
