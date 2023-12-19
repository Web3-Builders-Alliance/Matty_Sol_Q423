use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint,TokenAccount,TokenInterface, TransferChecked, transfer_checked, CloseAccount, close_account};



use crate::state::EscorwRecord;

#[derive(Accounts)]
pub struct Refund<'info>{
    #[account(mut)]
    pub maker: Signer<'info>,

    pub mint_x: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint_x,
        associated_token::authority = maker
    )]
    maker_x_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint_x,
        associated_token::authority = escrow_record,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    #[account (
        mut,
        has_one = mint_x,
        close = maker,
        seeds = [b"escrow",maker.key.as_ref(),escrow_record.escrow_seed.to_le_bytes().as_ref()],
        bump = escrow_record.escrow_bump
    )]
    pub escrow_record: Account<'info,EscorwRecord>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,  
    
}

impl <'info> Refund <'info> { 

    pub fn empty_vault_and_close(&mut self)->Result<()>{

        self.empty_vault()?;

        self.close_account()

    }

    pub fn empty_vault(&mut self)-> Result<()>{

        let amount = self.vault.amount;

        let accounts = TransferChecked {
            from: self.vault.to_account_info(),
            mint: self.mint_x.to_account_info(),
            to: self.maker_x_ata.to_account_info(),
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

        Ok(())

    }

    pub fn close_account(&mut self) -> Result<()>{

        let accounts = CloseAccount {
            account: self.vault.to_account_info(),
            destination: self.maker_x_ata.to_account_info(),
            authority: self.escrow_record.to_account_info(),
        };

        let binding = [self.escrow_record.escrow_bump];
        let signer_seeds = [&[
            b"escrow",
            self.maker.to_account_info().key.as_ref(), 
            &binding,
        ][..]]; 
        
        let cpi_ctx = CpiContext::new_with_signer(self.system_program.to_account_info()
        , accounts, &signer_seeds);
        let _ = close_account(cpi_ctx);

        Ok(())

    }

}