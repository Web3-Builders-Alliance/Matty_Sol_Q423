use anchor_lang::prelude::*;
use anchor_spl::{token::{Mint,TokenAccount,Token}, associated_token::AssociatedToken};

declare_id!("2qaWbGPrDecc3DaRJR5ZoCgqasQLGnopmyP36dqRVR72");

#[account]
pub struct Escorw{
    pub maker: Pubkey,
    pub escrow_bump: u8,
    //pub vault_bump: u8
}

impl Space for Escorw { 
    const INIT_SPACE: usize = 8 + 32 + 1 ;
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,
    
    pub taker_mint: Account<'info, Mint>, //becaues the maker reciever is getting the token from taker
    pub maker_mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = maker_mint,
        associated_token::authority = maker
    )]
    pub maker_ata: Account<'info, TokenAccount>,

    #[account (
        init,
        payer = maker,
        space = Escorw::INIT_SPACE,
        seeds = [b"escrow",maker.key.as_ref()],
        bump
    )]
    pub escrow: Account<'info,Escorw>,

    #[account(
        init_if_needed,
        payer = maker,
        associated_token::mint = maker_mint,
        associated_token::authority = escrow,
    )]
    pub vault: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info,AssociatedToken>,
    pub token_program: Program<'info, Token>
    
}

#[derive(Accounts)]
pub struct TakerDeposit<'info> {
    #[account(mut)]
    pub taker: Signer<'info>,

    #[account(mut)]
    pub maker: SystemAccount<'info>,

    pub maker_mint: Account<'info, Mint>,
    pub taker_mint: Account<'info, Mint>,

    #[account (
        mut,
        associated_token::mint = taker_mint,
        associated_token::authority = maker,
    )]
    pub maker_reciever_ata: Account<'info,TokenAccount>,

    #[account (
        mut,
        associated_token::mint = taker_mint,
        associated_token::authority = taker,
    )]
    pub taker_ata: Account<'info,TokenAccount>,

    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info,AssociatedToken>,
    pub token_program: Program<'info, Token>
}

#[derive(Accounts)]
pub struct Take<'info> {
    #[account(mut)]
    pub taker: Signer<'info>,

    #[account(mut)]
    pub maker: SystemAccount<'info>,

    pub maker_mint: Account<'info, Mint>,

    #[account(
        //mut,
        seeds = [b"escrow",maker.key.as_ref()],
        bump = escrow.escrow_bump,
    )]
    pub escrow: Account<'info, Escorw>,

    #[account(
        mut,
        associated_token::mint = maker_mint,
        associated_token::authority = escrow,
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account (
        mut,
        associated_token::mint = maker_mint,
        associated_token::authority = taker,
    )]
    pub taker_receiver_ata: Account<'info,TokenAccount>,

    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info,AssociatedToken>,
    pub token_program: Program<'info, Token>

    
}

#[derive(Accounts)]
pub struct Close<'info> {
    #[account(mut)]
    pub taker: Signer<'info>,

    #[account(mut)]
    pub maker: SystemAccount<'info>,

    pub maker_mint: Account<'info, Mint>,

    #[account(
        //mut,
        seeds = [b"escrow",maker.key.as_ref()],
        bump = escrow.escrow_bump,
    )]
    pub escrow: Account<'info, Escorw>,

    #[account(
        mut,
        associated_token::mint = maker_mint,
        associated_token::authority = escrow,
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account (
        mut,
        associated_token::mint = maker_mint,
        associated_token::authority = taker,
    )]
    pub taker_receiver_ata: Account<'info,TokenAccount>,

    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info,AssociatedToken>,
    pub token_program: Program<'info, Token>
    
}

#[program]
pub mod escrow {
    
    use anchor_spl::token::{Transfer, transfer, close_account, CloseAccount};

    use super::*;

    pub fn initialize_make(ctx: Context<Initialize>) -> Result<()> {
        //ctx.accounts.escrow.vault_bump= ctx.bumps.vault;
        ctx.accounts.escrow.escrow_bump= ctx.bumps.escrow;
        ctx.accounts.escrow.maker = ctx.accounts.maker.key();

        let accounts = Transfer {
            from: ctx.accounts.maker_ata.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.maker.to_account_info()
        
        };

        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(),accounts);

        let _ = transfer(cpi_ctx,1000);

        Ok(())
    }

    pub fn deposit_to_maker(ctx: Context<TakerDeposit>) -> Result<()> {

        let accounts = Transfer {
            from: ctx.accounts.taker_ata.to_account_info(),
            to: ctx.accounts.maker_reciever_ata.to_account_info(),
            authority: ctx.accounts.taker.to_account_info()
        };

        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(),accounts);

        let _ = transfer(cpi_ctx,2000);

        Ok(())
    }

    pub fn take(ctx: Context<Take>) -> Result<()> {

        let balance = ctx.accounts.vault.amount;

        let accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.taker_receiver_ata.to_account_info(),
            authority: ctx.accounts.escrow.to_account_info()
        };

        let binding = [ctx.accounts.escrow.escrow_bump];
        let signer_seeds = [&[
            b"escrow",
            ctx.accounts.escrow.maker.as_ref(),
            &binding,
        ][..]]; 
        
        let cpi_ctx = CpiContext::new_with_signer(ctx.accounts.system_program.to_account_info()
        , accounts, &signer_seeds);
        let _ = transfer(cpi_ctx, balance-100);//-100 is just to save some $$ before closing the acocunt.

        Ok(())
    }

    pub fn close_vault(ctx: Context<Close>) -> Result<()> {

        let accounts = CloseAccount {
            account: ctx.accounts.vault.to_account_info(),
            destination: ctx.accounts.taker_receiver_ata.to_account_info(),
            authority: ctx.accounts.escrow.to_account_info(),
        };

        let binding = [ctx.accounts.escrow.escrow_bump];
        let signer_seeds = [&[
            b"escrow",
            ctx.accounts.escrow.maker.as_ref(),
            &binding,
        ][..]]; 
        
        let cpi_ctx = CpiContext::new_with_signer(ctx.accounts.system_program.to_account_info()
        , accounts, &signer_seeds);
        let _ = close_account(cpi_ctx);

        Ok(())
    }

}