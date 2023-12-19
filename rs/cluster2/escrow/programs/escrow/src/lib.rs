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

// #[derive(Accounts)]
// pub struct Close<'info> {
//     #[account(mut)]
//     pub taker: Signer<'info>,

//     #[account(mut)]
//     pub maker: SystemAccount<'info>,

//     pub maker_mint: Account<'info, Mint>,

//     #[account(
//         //mut,
//         seeds = [b"escrow",maker.key.as_ref()],
//         bump = escrow.escrow_bump,
//     )]
//     pub escrow: Account<'info, Escorw>,

//     #[account(
//         mut,
//         associated_token::mint = maker_mint,
//         associated_token::authority = escrow,
//     )]
//     pub vault: Account<'info, TokenAccount>,

//     #[account (
//         mut,
//         associated_token::mint = maker_mint,
//         associated_token::authority = taker,
//     )]
//     pub taker_receiver_ata: Account<'info,TokenAccount>,

//     pub system_program: Program<'info, System>,
//     pub associated_token_program: Program<'info,AssociatedToken>,
//     pub token_program: Program<'info, Token>
    
// }

// #[program]
// pub mod escrow {
    
//     use anchor_spl::token::{Transfer, transfer, close_account, CloseAccount};

//     use super::*;

//     pub fn initialize_make(ctx: Context<Make>) -> Result<()> {
//         //ctx.accounts.escrow.vault_bump= ctx.bumps.vault;
//         ctx.accounts.escrow.escrow_bump= ctx.bumps.escrow;
//         ctx.accounts.escrow.maker = ctx.accounts.maker.key();

       
//         Ok(())
//     }

//     pub fn deposit_to_maker(ctx: Context<TakerDeposit>) -> Result<()> {

//         let accounts = Transfer {
//             from: ctx.accounts.taker_ata.to_account_info(),
//             to: ctx.accounts.maker_reciever_ata.to_account_info(),
//             authority: ctx.accounts.taker.to_account_info()
//         };

//         let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(),accounts);

//         let _ = transfer(cpi_ctx,2000);

//         Ok(())
//     }

//     pub fn take(ctx: Context<Take>) -> Result<()> {

//         let balance = ctx.accounts.vault.amount;

//         let accounts = Transfer {
//             from: ctx.accounts.vault.to_account_info(),
//             to: ctx.accounts.taker_receiver_ata.to_account_info(),
//             authority: ctx.accounts.escrow.to_account_info()
//         };

//         let binding = [ctx.accounts.escrow.escrow_bump];
//         let signer_seeds = [&[
//             b"escrow",
//             ctx.accounts.escrow.maker.as_ref(),
//             &binding,
//         ][..]]; 
        
//         let cpi_ctx = CpiContext::new_with_signer(ctx.accounts.system_program.to_account_info()
//         , accounts, &signer_seeds);
//         let _ = transfer(cpi_ctx, balance);//-100 is just to save some $$ before closing the acocunt.

//         Ok(())
//     }

//     pub fn close_vault(ctx: Context<Close>) -> Result<()> {

//         let accounts = CloseAccount {
//             account: ctx.accounts.vault.to_account_info(),
//             destination: ctx.accounts.taker_receiver_ata.to_account_info(),
//             authority: ctx.accounts.escrow.to_account_info(),
//         };

//         let binding = [ctx.accounts.escrow.escrow_bump];
//         let signer_seeds = [&[
//             b"escrow",
//             ctx.accounts.escrow.maker.as_ref(),
//             &binding,
//         ][..]]; 
        
//         let cpi_ctx = CpiContext::new_with_signer(ctx.accounts.system_program.to_account_info()
//         , accounts, &signer_seeds);
//         let _ = close_account(cpi_ctx);

//         Ok(())
//     }

// }