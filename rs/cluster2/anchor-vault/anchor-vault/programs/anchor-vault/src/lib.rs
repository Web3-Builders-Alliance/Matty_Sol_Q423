use anchor_lang::prelude::*;

declare_id!("HkV1c91adQfR3rsbg4vGhrdYYdGu8NPzFwAmfmA6Cmju");

#[program]
pub mod anchor_vault {
    use anchor_lang:: system_program::{Transfer, transfer};

    use super::*;

    pub fn deposit(ctx: Context<Vault>, lamports: u64) -> Result<()> {
        let accounts = Transfer {
            from: ctx.accounts.signer.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
        };
        
        let cpi_ctx = CpiContext::new(ctx.accounts.system_program.to_account_info(),accounts);
        transfer(cpi_ctx, lamports)
    }

    pub fn withdraw(ctx: Context<Vault>,lamports: u64) -> Result<()> {
        let accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.signer.to_account_info(),
        };

        let binding = [ctx.bumps.vault];
        let signer_seeds = [&[
            b"vault",
            ctx.accounts.signer.clone().key.as_ref(),
            &binding,
        ][..]];
        
        let cpi_ctx = CpiContext::new_with_signer(ctx.accounts.system_program.to_account_info()
        , accounts, &signer_seeds);
        transfer(cpi_ctx, lamports)
    }
}

#[derive(Accounts)]
pub struct Vault<'info> {
    #[account(mut)]
    signer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault", signer.key().as_ref()],
        bump
    )]
    vault: SystemAccount<'info>,
    system_program: Program<'info, System>,

}
