use anchor_lang::prelude::*;
use anchor_spl::{token_interface::{Mint, TokenAccount, TokenInterface, TransferChecked, transfer_checked, MintTo, mint_to}, associated_token::AssociatedToken};
use constant_product_curve::ConstantProduct;

use crate::{Config, errors::AmmError};
use crate::{ assert_not_locked, assert_not_expired, assert_non_zero};

#[derive(Accounts)]
pub struct Deposit <'info> { 
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub mint_x: InterfaceAccount<'info, Mint>,
    pub mint_y: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        //seeds = [b"lp",config.key().as_ref()],
        //bump= config.lp_bump,
        mint::decimals = 6,
        mint::authority = auth,
    )]
    pub lp_mint: InterfaceAccount<'info, Mint>,

    /// CHECK:`PDA used for signing
    #[account( seeds =[b"auth"], bump = config.auth_bump)]
    pub auth: UncheckedAccount<'info>,

    #[account(
        has_one = mint_x,
        has_one = mint_y,
        seeds = [b"config",config.seed.to_le_bytes().as_ref()],
        bump = config.bump
    )]
    pub config: Account<'info, Config>,

    #[ account (
        mut,
        associated_token::mint = mint_x,
        associated_token::authority = auth
    )]
    pub vault_x: InterfaceAccount<'info,TokenAccount>,

    #[ account (
        mut,
        associated_token::mint = mint_x,
        associated_token::authority = user
    )]
    pub user_vault_x: InterfaceAccount<'info, TokenAccount>,

    #[ account (
        mut,
        associated_token::mint = mint_y,
        associated_token::authority = auth
    )]
    pub vault_y: InterfaceAccount<'info, TokenAccount>,

    #[ account (
        mut,
        associated_token::mint = mint_y,
        associated_token::authority = user
    )]
    pub user_vault_y: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        
        associated_token::mint = lp_mint,
        associated_token::authority = user,
    )]
    pub user_lp_token: InterfaceAccount<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info,AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>   
}

impl <'info> Deposit <'info> {

//     pub fn deposit_tokens(
//         &mut self,
//         expected_amount: u64,
//         x_max:u64,
//         y_max:u64,
//         expiration: i64
//     )->Result<()>{

//         //validate errors/exceptions here
//         assert_not_locked!(self.config.locked);
//         assert_not_expired!(expiration);
//         assert_non_zero!([expected_amount,x_max,y_max]);

//         let(x,y) = match self.lp_mint.supply==0 && self.vault_x.amount==0 && self.vault_y.amount==0 {
//             true => (x_max,y_max),
//             false => {
//                 let amounts = ConstantProduct::xy_deposit_amounts_from_l(
//                     self.vault_x.amount, 
//                     self.vault_y.amount, 
//                     self.lp_mint.supply,
//                      expected_amount, 
//                     6).map_err(AmmError::from)?;

//                     (amounts.x,amounts.y)
//                 }
//         };

//         require!(x <= x_max && y <= y_max, AmmError::SlippageLimitExceeded);

//         self.deposit(x, true)?;
//         self.deposit(y, false)?;

//         self.mint_lp_tokens(expected_amount)
// //Ok(())
        
//     }

//     pub fn deposit(&mut self,amount:u64, is_x: bool)-> Result<()>{

//         let(from, to, decimal, mint) = 
//         match  is_x {
//             true => (self.user_vault_x.to_account_info(),self.vault_x.to_account_info(),self.mint_x.decimals,self.mint_x.to_account_info()),
//             false => (self.user_vault_y.to_account_info(),self.vault_y.to_account_info(),self.mint_y.decimals,self.mint_y.to_account_info()),
//         };
//         let accounts = TransferChecked {
//             from,
//             to,
//             authority: self.user.to_account_info(),
//             mint
//         };

//         let cpi_ctx = CpiContext::new(self.token_program.to_account_info(),accounts);

//         transfer_checked(cpi_ctx,amount,decimal)

//     }

//     pub fn mint_lp_tokens(&mut self, amount: u64)-> Result<()>{
//         let  accounts = MintTo {
//             mint: self.lp_mint.to_account_info(),
//             to: self.user_lp_token.to_account_info(),
//             authority: self.auth.to_account_info(),
//         };

//         let seeds = &[
//             &b"auth" [..],
//             &[self.config.auth_bump],
//             ];
//         let signer_seeds= & [&seeds[..]];
        
//         let cpi_program = self.token_program.to_account_info();
//         let cpi_ctx = CpiContext::new_with_signer(cpi_program, accounts, signer_seeds);

//         mint_to(cpi_ctx, amount)

//     }

}
