use anchor_lang::prelude::*;
use anchor_spl::{token_interface::{Mint, TokenAccount, TokenInterface, TransferChecked, transfer_checked, Burn, burn}, associated_token::AssociatedToken};
use constant_product_curve::ConstantProduct;

use crate::{Config, assert_not_expired, assert_not_locked, assert_non_zero, errors::AmmError};

#[derive(Accounts)]
pub struct Withdraw <'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    pub lp_mint: InterfaceAccount<'info, Mint>,
    pub mint_x: InterfaceAccount<'info, Mint>,
    pub mint_y: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = lp_mint,
        associated_token::authority = user
    )]
    pub user_lp_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint_x,
        associated_token::authority = auth
    )]
    pub user_x_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint_y,
        associated_token::authority = auth
    )]
    pub user_y_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint_x,
        associated_token::authority = auth
    )]
    pub lp_x_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint_y,
        associated_token::authority = auth
    )]
    pub lp_y_vault: InterfaceAccount<'info, TokenAccount>,

    /// CHECK:`PDA used for signing
    #[account(seeds = [b"auth"], bump = config.auth_bump)]
    pub auth: UncheckedAccount<'info>,

    #[account(
        has_one = mint_x,
        has_one = mint_y,
        seeds = [b"config", config.seed.to_le_bytes().as_ref()],
        bump = config.bump
    )]
    pub config: Account<'info, Config>,

    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info,AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>  

}

impl <'info> Withdraw <'info> { 

    pub fn withdraw_tokens(
        &mut self, 
        lp_amount: u64,
         x_min: u64, 
         y_min: u64,
         expiration: i64)-> Result<()>{

        //assert amounts not 0, 
        assert_not_expired!(expiration);
        assert_not_locked!(self.config.locked);
        assert_non_zero!([lp_amount,x_min,y_min]);

        let(x,y) = match self.lp_x_vault.amount==0 || self.lp_y_vault.amount==0 {
            true => return Err(AmmError::Rugged.into()),
            false => {
                let amounts = ConstantProduct::xy_withdraw_amounts_from_l(
                    self.lp_x_vault.amount, 
                    self.lp_y_vault.amount, 
                    self.lp_mint.supply,
                     lp_amount, 
                    6).map_err(AmmError::from)?;

                    (amounts.x,amounts.y)
                }

        };
        require!(x >= x_min && y >= y_min, AmmError::SlippageLimitExceeded);

      
        self.withdraw(x, true)?;
        self.withdraw(y, false)?;

        self.burn_lp_token(lp_amount)
    }

    pub fn withdraw(&mut self,amount: u64, is_x: bool)-> Result<()>{

        let (from, to, mint , decimal) = 
        match is_x {
            true => 
                (self.lp_x_vault.to_account_info(), self.user_x_vault.to_account_info(), self.mint_x.to_account_info(),self.mint_x.decimals),

            false => 
                (self.lp_y_vault.to_account_info(), self.user_y_vault.to_account_info(), self.mint_y.to_account_info(),self.mint_y.decimals)
            
        };

        let accounts = TransferChecked {
            from,
            mint,
            to,
            authority: self.user.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(self.token_program.to_account_info(),accounts);
        transfer_checked(cpi_ctx, amount, decimal)

    }

    pub fn burn_lp_token(&mut self, amount: u64)-> Result<()>{

        let cpi_ctx = CpiContext::new(
            self.token_program.to_account_info(),
            Burn {
                mint: self.lp_mint.to_account_info(),
                from: self.user_lp_vault.to_account_info(),
                authority: self.user.to_account_info(),
            },
        );

        burn(cpi_ctx, amount)
        

    }
}