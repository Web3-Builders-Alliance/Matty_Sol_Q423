use anchor_lang::prelude::*;

#[account]
pub struct EscorwRecord{
    pub escrow_seed:u64,
    pub escrow_bump: u8,
    pub mint_x: Pubkey,
    pub mint_y: Pubkey,
    pub recieve_amount: u64
}

impl Space for EscorwRecord { 
    const INIT_SPACE: usize = 8 + 8 * 2 + 32 * 2 + 1 ;
}