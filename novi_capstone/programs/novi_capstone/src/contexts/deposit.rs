use anchor_lang::{prelude::*, solana_program::entrypoint::ProgramResult};
use anchor_spl::{token_interface::{Mint, TokenAccount, TokenInterface, TransferChecked, transfer_checked, MintTo, mint_to}, associated_token::AssociatedToken};

use crate::{state::Config, error::MemeError, assert_non_zero};

#[derive(Accounts)]
pub struct Deposit<'info>{

    #[account(mut)]
    pub user: Signer<'info>,
    #[account( seeds =[b"auth"], bump)]
    pub auth: UncheckedAccount<'info>,

    #[account(
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, Config>,

    pub usdc_mint: InterfaceAccount<'info, Mint>,
    pub bonk_mint: InterfaceAccount<'info, Mint>,
    pub wif_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = user
    )]
    pub user_usdc: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = bonk_mint,
        associated_token::authority = auth
    )]
    pub vault_bonk: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = wif_mint,
        associated_token::authority = auth

    )]
    pub vault_wif: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = auth
    )]
    pub usdc_fee_account: InterfaceAccount<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>,

}

impl <'info> Deposit <'info> {
    pub fn deposit(
        &mut self,
        bumps: &DepositBumps,
        deposit_amount: u64,
    ) -> ProgramResult {
            
            assert_non_zero!(fee);
    
            Ok(())
    }

    fn swap_usdc_to_bonk (
        &mut self,
        amount: u64) -> ProgramResult {

            Ok(())

    }
    
    fn swap_usdc_to_wif (
        &mut self,
        amount: u64) -> ProgramResult {

            Ok(())

    }

    fn route_to_jupiter (
        &mut self,
        amount: u64) -> ProgramResult {

        assert_non_zero!(amount);

        use jupiter_cpi;

        let signer_seeds: &[&[&[u8]]] = &[..];

        // pass accounts to context one-by-one and construct accounts here.
        // Or in practise, it may be easier to use `remaining_accounts` https://book.anchor-lang.com/anchor_in_depth/the_program_module.html
        let accounts = jupiter_cpi::cpi::accounts::SharedAccountsRoute {
            token_program: self.token_program.to_account_info() ,
            program_authority: self.auth.to_account_info() ,
            user_transfer_authority: self.user.to_account_info() ,
            source_token_account: self.user_usdc.to_account_info() ,
            program_source_token_account: self.u ,
            program_destination_token_account: ,
            destination_token_account: self ,
            source_mint: self.usdc_mint.to_account_info() ,
            destination_mint: self.bonk_mint.to_account_info() ,
            platform_fee_account: self.usdc_fee_account.to_account_info() ,
            token_2022_program: self.token_program.to_account_info() ,
        };

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.jup.to_account_info(),
            accounts,
            signer_seeds,
        );

        jupiter_cpi::cpi::shared_accounts_route(
            cpi_ctx,
            id,
            route_plan,
            in_amount,
            quoted_out_amount,
            slippage_bos,
            platform_fee_bps,
        )?;

            Ok(())

    }
        
}