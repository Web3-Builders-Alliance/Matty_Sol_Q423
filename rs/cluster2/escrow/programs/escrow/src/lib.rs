use anchor_lang::prelude::*;

pub mod state;
pub mod contexts;

pub use state::*;
pub use contexts::*;

declare_id!("2qaWbGPrDecc3DaRJR5ZoCgqasQLGnopmyP36dqRVR72");

#[program]
pub mod escrow {
    use super::*;

    pub fn make(ctx: Context<Make>, seed: u64, deposit: u64, recieve_amount: u64)->Result<()>{
        ctx.accounts.make(seed, deposit ,recieve_amount, &ctx.bumps)
    }

    pub fn take(ctx: Context<Take>)->Result<()>{
        ctx.accounts.take()
    }

    pub fn refund(ctx: Context<Refund>)->Result<()>{
        ctx.accounts.empty_vault_and_close()
    }
}