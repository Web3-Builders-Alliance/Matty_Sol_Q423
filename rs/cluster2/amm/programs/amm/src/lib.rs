use anchor_lang::prelude::*;

declare_id!("7rPUxZYYe8o54ycu52uhoihvqNXeTuFKp8DUzMZrUqAn");

pub mod state;
pub mod context;
pub mod errors;
pub mod helpers;

pub use state::*;
pub use context::*;

#[program]
pub mod amm {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, seed: u64, fee: u16, config_authority: Option<Pubkey>) -> Result<()> {
        ctx.accounts.init(&ctx.bumps,seed,fee,config_authority)

    }

    pub fn update_fee(ctx: Context<Update>, fee: u16) -> Result<()> {
        ctx.accounts.updateFee(fee)

    }

    pub fn deposit(ctx: Context<Deposit>, lp_recievie_amount: u64, x_max: u64, y_max: u64, expiration: i64) -> Result<()> {
        ctx.accounts.deposit_tokens(lp_recievie_amount, x_max, y_max, expiration)

    }

    pub fn withdraw(ctx: Context<Withdraw>, lp_amount: u64, x_min: u64, y_min: u64, expiration: i64) -> Result<()> {
        ctx.accounts.withdraw_tokens(lp_amount, x_min, y_min, expiration)

    }
    
}

