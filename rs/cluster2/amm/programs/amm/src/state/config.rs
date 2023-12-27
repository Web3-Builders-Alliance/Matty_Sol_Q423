use anchor_lang::prelude::*;

#[account]
pub struct Config {
    pub seed: u64,
    pub authority: Option<Pubkey>,
    pub mint_x: Pubkey,
    pub mint_y: Pubkey,
    pub locked: bool,
    pub bump:u8,
    pub lp_bump:u8,
    pub auth_bump: u8,
    pub fee: u16,
}

impl Space for Config {
    const INIT_SPACE: usize = 8 + 8 + (1 + 32) + (2 * 32) + (4 * 1) + 2 ;
}