use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint,TokenAccount,TokenInterface, TransferChecked, transfer_checked};
use anchor_spl::associated_token::AssociatedToken;

use crate::state::EscorwRecord;

#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct Make<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,
    
    pub mint_x: InterfaceAccount<'info, Mint>, //becaues the maker reciever is getting the token from taker
    pub mint_y: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint_x,
        associated_token::authority = maker
    )]
    pub maker_x_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = maker,
        associated_token::mint = mint_y,
        associated_token::authority = maker,
    )]
    pub maker_y_ata: InterfaceAccount<'info, TokenAccount>,

    #[account (
        init,
        payer = maker,
        space = EscorwRecord::INIT_SPACE,
        seeds = [b"escrow",maker.key.as_ref(),seed.to_le_bytes().as_ref()],
        bump
    )]
    pub escrow_record: Account<'info,EscorwRecord>,

    #[account(
        init,
        payer = maker,
        associated_token::mint = mint_x,
        associated_token::authority = escrow_record,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info,AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>   
}

impl <'info> Make<'info> {

    pub fn make(&mut self, seed: u64,deposit: u64, recieve_amount: u64, bumps: &MakeBumps) -> Result<()> {
        self.escrow_record.escrow_seed = seed;
        self.escrow_record.escrow_bump = bumps.escrow_record;
        self.escrow_record.mint_x = self.mint_x.key();
        self.escrow_record.mint_y = self.mint_y.key();
        self.escrow_record.recieve_amount = recieve_amount;

        self.transfer(deposit)
        
    }

    pub fn transfer(&mut self,deposit: u64) -> Result<()>{

        let accounts = TransferChecked {
            from: self.maker_x_ata.to_account_info(),
            to: self.vault.to_account_info(),
            authority: self.maker.to_account_info(),
            mint: self.mint_x.to_account_info(),
        
        };

        let cpi_ctx = CpiContext::new(self.token_program.to_account_info(),accounts);

        let _ = transfer_checked(cpi_ctx,deposit,self.mint_x.decimals);


        Ok(())

    }
    
}

