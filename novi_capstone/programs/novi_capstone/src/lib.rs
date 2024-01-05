use anchor_lang::prelude::*;

pub mod contexts;
pub mod state;
pub mod helpers;
pub mod error;

declare_id!("AtAZe5QUrvRJvggMvZ8Cmr5mB4N5mgJMR7F4sjJwnZ9t");
#[program]
pub mod novi_capstone {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
