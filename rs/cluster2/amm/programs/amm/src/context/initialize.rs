use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint,TokenAccount,TokenInterface, TransferChecked, transfer_checked};
use anchor_spl::associated_token::AssociatedToken;

use crate::errors::AmmError;
use crate::state::Config;

#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct Initialize <'info> {
    #[account(mut)]
    pub initializer: Signer<'info>,
    pub mint_x: InterfaceAccount<'info, Mint>,
    pub mint_y: InterfaceAccount<'info, Mint>,

    /// CHECK:`PDA used for signing
    #[account(seeds= [b"auth"],bump)]
    pub auth: UncheckedAccount<'info>,

    #[account(
        init,
        payer = initializer,
        space = Config::INIT_SPACE,
        seeds = [b"config",seed.to_le_bytes().as_ref()],
        bump,
    )]
    pub config: Account<'info, Config>,

    #[account(
        init,
        payer = initializer,
        seeds = [b"lp",config.key().as_ref()],
        bump,
        mint::decimals = 6,
        mint::authority = auth,
    )]
    pub lp_mint: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = initializer,
        associated_token::mint = mint_x,
        associated_token::authority = auth
    )]
    pub valut_x: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init,
        payer = initializer,
        associated_token::mint = mint_y,
        associated_token::authority = auth
    )]
    pub valut_y: InterfaceAccount<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info,AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>   
    
}

impl <'info> Initialize <'info> {

    pub fn init(
        &mut self,
        bumps: &InitializeBumps,
        seed: u64,
        fee: u16,
        authority: Option<Pubkey>
    )-> Result<()>{

       require!(fee<=10000, AmmError::InvalidFee);

       self.config.set_inner(
        Config{
            seed,
            authority,
            bump: bumps.config,
            mint_x: self.mint_x.key(),
            mint_y: self.mint_y.key(),
            locked: false,
            lp_bump: bumps.lp_mint,
            auth_bump: bumps.auth,
            fee
        }
        
       );

        Ok(())


    }

}