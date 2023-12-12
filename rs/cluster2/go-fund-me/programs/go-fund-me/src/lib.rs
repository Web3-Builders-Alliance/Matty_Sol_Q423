use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token::{Token, Mint, TokenAccount}};

declare_id!("J6rEQGR3fFqSHf6TKsRku3r7qmQZ1FHvz7CReoNsczUr");

#[account]
pub struct CampaignEscrow {
    pub fundraiser_ata: Pubkey,
    //pub vault_ata: Pubkey,
    pub goal_amount: u64,
    pub escrow_bump: u8,
    pub vault_bump: u8,
    
}

impl Space for CampaignEscrow {
    const INIT_SPACE:usize = 32  + 8  + 1 + 1 + 8;
}

#[derive(Accounts)]
pub struct InitCampaign<'info> {
    #[account(mut)]
    pub fundraiser: Signer<'info>,

    #[account(
        mut,
        token::mint = token_mint,
        token::authority = fundraiser,
    )]
    pub fundraiser_ata: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = fundraiser,
        space = CampaignEscrow::INIT_SPACE,
        seeds = [b"escrow",fundraiser.key().as_ref()],
        bump
    )]
    pub escrow: Account<'info, CampaignEscrow>,

    #[account(
        init,
        payer = fundraiser,
        seeds = [b"vault", escrow.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = escrow,
    )]
    pub vault: Account<'info, TokenAccount>,
    pub token_mint: Account<'info, Mint>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
   
}


#[derive(Accounts)]
pub struct DonateCampaign<'info> {
    #[account(mut)]
    pub donor: Signer<'info>,

    //send the seed 
    #[account(
        seeds = [b"escrow",escrow.fundraiser_ata.key().as_ref()],
        bump = escrow.escrow_bump,
    )]
    pub escrow: Account<'info, CampaignEscrow>,

    #[account(
        mut,
        seeds = [b"vault", escrow.key().as_ref()],
        bump = escrow.vault_bump,
        token::mint = token_mint,
        token::authority = escrow
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = token_mint,
        token::authority = donor,
    )]
    pub donor_ata: Account<'info, TokenAccount>,

    pub token_mint: Account<'info, Mint>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,

}

#[program]
pub mod go_fund_me {
    use anchor_spl::token::{ Transfer, transfer};


    use super::*;

    pub fn initialize_campaign(ctx: Context<InitCampaign>) -> Result<()> {
        ctx.accounts.escrow.goal_amount = 100;
        ctx.accounts.escrow.escrow_bump = ctx.bumps.escrow;
        ctx.accounts.escrow.vault_bump = ctx.bumps.vault;
        ctx.accounts.escrow.fundraiser_ata = *ctx.accounts.fundraiser_ata.to_account_info().key;
        Ok(())
    }

    pub fn donate(ctx: Context<DonateCampaign>, amount: u64) -> Result<()> {

        let cpi_accounts = Transfer {
            from: ctx.accounts.donor_ata.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.donor.to_account_info(),
        };
        let ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        let _ = transfer(ctx, amount);
        
        Ok(())
    }
}