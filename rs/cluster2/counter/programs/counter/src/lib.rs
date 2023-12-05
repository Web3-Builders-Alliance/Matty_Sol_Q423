use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount, Token, MintTo, mint_to};
use anchor_lang:: system_program::{Transfer, transfer};

declare_id!("G3P8xEy536E9aqdNtBDzdVxKjdgDefz59EYYR52F5cbr");


#[account]
pub struct Counter {
    counter_num: i64,
    bump:u8
}

impl Space for Counter{
    const INIT_SPACE:usize = 8+8+1;
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    signer: Signer<'info>,
    #[account(
        init,
        payer = signer,
        space = Counter::INIT_SPACE,
        seeds = ["counter".as_bytes(),signer.key().as_ref()],
        bump
    )]
    counter: Account<'info,Counter>,
    system_program: Program<'info, System>
}


#[derive(Accounts)]
pub struct CheckCounter<'info> {
    //account -> signer, ata, token program 
    #[account(mut)]
    signer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"counter",signer.key().as_ref()],
        bump = counter.bump
    )]
    counter: Account<'info,Counter>,
    
    #[account(mut)]
    mint: Account<'info,Mint>,

    #[account(mut)]
    ata: Account<'info, TokenAccount>,

    token_program: Program<'info, Token>

}

#[derive(Accounts)]
pub struct IncrementDecrement<'info>{
    #[account(mut)]
    signer: Signer<'info>,
    #[account(
        mut,
        seeds = [b"counter",signer.key().as_ref()],
        bump = counter.bump
    )]
    counter: Account<'info,Counter>,
    system_program: Program<'info, System>

}

#[program]
pub mod counter {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        ctx.accounts.counter.counter_num=0;
        ctx.accounts.counter.bump = ctx.bumps.counter;
        Ok(())
    }

    pub fn count (ctx:Context<IncrementDecrement>, val:i64) -> Result<()> {
        ctx.accounts.counter.counter_num +=val;
        Ok(())

    }

    pub fn check_counter(ctx: Context<CheckCounter>) -> Result<()> {
        if ctx.accounts.counter.counter_num==90 {

            let accounts = MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.ata.to_account_info(),
                authority: ctx.accounts.counter.to_account_info()
   
           };

           let binding = [ctx.accounts.counter.bump];
           let signer_seeds = [&[
               b"counter",
               ctx.accounts.signer.clone().key.as_ref(),
               &binding,
           ][..]];

           let cpi_ctx = CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info()
        , accounts, &signer_seeds);
        
           mint_to(cpi_ctx,10000);
        }

        Ok(())
    }
}
