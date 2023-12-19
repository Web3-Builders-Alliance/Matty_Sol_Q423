use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint,TokenAccount,TokenInterface, TransferChecked, transfer_checked};


use crate::state::EscorwRecord;

#[derive(Accounts)]
pub struct Take<'info>{
    #[account(mut)]
    taker: Signer<'info>,

    #[account()]
    maker: SystemAccount<'info>,

    mint_y: InterfaceAccount<'info, Mint>,
    mint_x: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint_y,
        associated_token::authority = taker
    )]
    taker_y_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint_y,
        associated_token::authority = maker
    )]
    maker_y_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint_x,
        associated_token::authority = taker
    )]
    taker_x_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint_x,
        associated_token::authority = escrow_record,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    #[account (
        mut,
        has_one = mint_x,
        has_one = mint_y,
        seeds = [b"escrow",maker.key.as_ref(),escrow_record.escrow_seed.to_le_bytes().as_ref()],
        bump = escrow_record.escrow_bump
    )]
    pub escrow_record: Account<'info,EscorwRecord>,
    
    pub token_program: Interface<'info, TokenInterface>   

}

impl <'info> Take<'info> {

    pub fn take (&mut self)->Result<()> {

        self.transfer( true)?;

        self.transfer( false)


    }

    pub fn transfer(&mut self, is_mint_x: bool )-> Result<()>{

        match  is_mint_x {
            true => {

                let amount = self.vault.amount;

                let accounts = TransferChecked {
                    from: self.vault.to_account_info(),
                    mint: self.mint_x.to_account_info(),
                    to: self.taker_x_ata.to_account_info(),
                    authority: self.escrow_record.to_account_info()
                };

                let signer_seeds: [&[&[u8]];1] = [
                    &[
                        b"escrow", 
                        self.maker.to_account_info().key.as_ref(), 
                        &self.escrow_record.escrow_seed.to_le_bytes()[..],
                        &[self.escrow_record.escrow_bump]
                    ]
                ];
                
                let cpi_program = self.token_program.to_account_info();
                let cpi_ctx = CpiContext::new_with_signer(cpi_program, accounts, &signer_seeds);

                transfer_checked(cpi_ctx, amount, self.mint_x.decimals)?;

            }
            false => {
                let amount = self.taker_y_ata.amount;

                let accounts = TransferChecked {
                    from: self.taker_y_ata.to_account_info(),
                    to: self.maker_y_ata.to_account_info(),
                    authority: self.taker.to_account_info(),
                    mint: self.mint_y.to_account_info(),
                
                };
        
                let cpi_ctx = CpiContext::new(self.token_program.to_account_info(),accounts);
        
                let _ = transfer_checked(cpi_ctx,amount,self.mint_y.decimals);

            }
            
        }

    Ok(())
    }

}