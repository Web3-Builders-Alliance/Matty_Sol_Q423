use anchor_lang::prelude::*;

#[account]
pub struct Config {
    //pub seed: u64,
    pub authority: Option<Pubkey>,
    pub usdc_fee_account: Pubkey,
    pub usdc_mint: Pubkey,
    pub bonk_mint: Pubkey,
    pub wif_mint: Pubkey,
    pub bump:u8,
    pub auth_bump: u8,
    pub fee: u16,
}

impl Space for Config {
    const INIT_SPACE: usize = 8  + (1 + 32) + (4 * 32) + (2 * 1) + 2 ;
}