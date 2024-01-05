use anchor_lang::{prelude::*, solana_program::entrypoint::ProgramResult};
use anchor_spl::{token_interface::{Mint, TokenAccount, TokenInterface, TransferChecked, transfer_checked, MintTo, mint_to}, associated_token::AssociatedToken};

use crate::{state::Config, error::MemeError, assert_non_zero};
//TODO more validation
#[derive(Accounts)]

//TODO add seeds
pub struct Initialize<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account( seeds =[b"auth"], bump)]
    pub auth: UncheckedAccount<'info>,

    //Q: one configuration for all users?
    #[account(
        init,
        payer = user,
        seeds = [b"config"],
        space = Config::INIT_SPACE,
        bump
    )]
    pub config: Account<'info, Config>,

    pub usdc_mint: InterfaceAccount<'info, Mint>,
    pub bonk_mint: InterfaceAccount<'info, Mint>,
    pub wif_mint: InterfaceAccount<'info, Mint>,

    //Q: for vaults that will be the same for all users, 
    //do we need to create one account at deployment?
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

    //to collect fees on withdrawals ?
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

impl <'info> Initialize <'info> {
    pub fn initialize(
        &mut self,
        bumps: &InitializeBumps,
        fee: u16,
    ) -> ProgramResult {
        
        assert_non_zero!(fee);

        self.config.set_inner(
             Config {
            authority: Some(self.auth.key()),
            usdc_mint: self.usdc_mint.key(),
            bonk_mint: self.bonk_mint.key(),
            wif_mint: self.wif_mint.key(),
            usdc_fee_account: self.usdc_fee_account.key(),
            bump: bumps.config,
            auth_bump: bumps.auth,
            fee
        });
        
        Ok(())
    }
}