use anchor_lang::prelude::*;

use crate::{Config, errors::AmmError};

#[derive(Accounts)]
pub struct Update<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        mut,
        seeds = [b"config",config.seed.to_le_bytes().as_ref()],
        bump = config.bump
    )]
    pub config: Account<'info, Config>
    
}

impl<'info> Update <'info> {

    pub fn lock (&mut self, locked: bool)-> Result<()>{
        require!(self.config.authority.unwrap()==self.signer.key(),AmmError::UnauthorizedUser);

        match self.config.locked {
            false => {
                self.config.locked = locked;

            }
            true => (),
            
        }
        
        Ok(())

    }

    pub fn unlock (&mut self, locked: bool)-> Result<()>{
        require!(self.config.authority.unwrap()==self.signer.key(),AmmError::UnauthorizedUser);

        match self.config.locked {
            false => (),
            true => {
                self.config.locked = locked;

            }
            
        }
    
        Ok(())

    }

    pub fn updateFee (&mut self, fee: u16)-> Result<()>{

        require!(fee<10000, AmmError::InvalidFee);

        self.config.fee = fee;
        Ok(())

    }
}