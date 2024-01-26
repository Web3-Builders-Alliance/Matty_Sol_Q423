use anchor_lang::{
    prelude::*,
    solana_program::{entrypoint::ProgramResult, instruction::Instruction, program::invoke_signed,
       native_token::LAMPORTS_PER_SOL
    },
    system_program,
};
use anchor_spl::token::{self, Mint, Token, TokenAccount};


use mpl_inscription::*;
use mpl_inscription::programs::MPL_INSCRIPTION_ID;

declare_id!("5XgQemzvKnPyfgpdisFzexL7VEvWcj4Tng5rq84YrsgY");

pub const AUTHORITY_SEED: &[u8] = b"authority";
pub const WSOL_SEED: &[u8] = b"wsol";

mod jupiter {
    use anchor_lang::declare_id;
    declare_id!("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4");
}

#[derive(Clone)]
pub struct Jupiter;

impl anchor_lang::Id for Jupiter {
    fn id() -> Pubkey {
        jupiter::id()
    }
}

#[error_code]
pub enum ErrorCode {
    InvalidReturnData,
    InvalidJupiterProgram,
    IncorrectOwner,
}

#[program]
pub mod swap_to_sol {
    use super::*;
    

    pub fn swap_to_sol(ctx: Context<SwapToSOL>, data: Vec<u8>) -> Result<()> {

        let inscription_program =&ctx.accounts.mpl_inscription_program.to_account_info();
        let mut x = mpl_inscription::instructions::WriteDataCpiBuilder::new(inscription_program);
        x.inscription_account(&ctx.accounts.inscription_account);
        x.inscription_metadata_account(&ctx.accounts.inscription_metadata_account);

        
        x.value(b"'{BONK: 10000, WIF: 20000}'".to_vec());
        x.payer(&ctx.accounts.user_account);
        x.authority(Some(&ctx.accounts.program_authority));
        x.invoke()?;
        

        // let authority_bump = ctx.bumps.program_authority;
        // let wsol_bump = ctx.bumps.program_wsol_account;

        // create_wsol_token_idempotent(
        //     ctx.accounts.user_account.clone(),
        //     ctx.accounts.program_authority.clone(),
        //     ctx.accounts.program_wsol_account.clone(),
        //     ctx.accounts.sol_mint.clone(),
        //     ctx.accounts.token_program.clone(),
        //     ctx.accounts.system_program.clone(),
        //     &[authority_bump],
        //     &[wsol_bump],
        // )?;

        // msg!("Swap on Jupiter");
        // swap_on_jupiter(
        //     ctx.remaining_accounts,
        //     ctx.accounts.jupiter_program.clone(),
        //     data,
        // )?;

        // let after_swap_lamports = ctx.accounts.program_wsol_account.lamports();

        // close_program_wsol(
        //     ctx.accounts.program_authority.clone(),
        //     ctx.accounts.program_wsol_account.clone(),
        //     ctx.accounts.token_program.clone(),
        //     &[authority_bump],
        // )?;

        // let rent = Rent::get()?;
        // let space = TokenAccount::LEN;
        // let token_lamports = rent.minimum_balance(space);
        // let out_amount = after_swap_lamports - token_lamports;

        // msg!("Transfer SOL to user");
        // let signer_seeds: &[&[&[u8]]] = &[&[AUTHORITY_SEED, &[authority_bump]]];
        // let lamports = out_amount;
        // system_program::transfer(
        //     CpiContext::new_with_signer(
        //         ctx.accounts.system_program.to_account_info(),
        //         system_program::Transfer {
        //             from: ctx.accounts.program_authority.to_account_info(),
        //             to: ctx.accounts.user_account.to_account_info(),
        //         },
        //         signer_seeds,
        //     ),
        //     lamports,
        // )?;

        Ok(())
    }
}

fn swap_on_jupiter<'info>(
    remaining_accounts: &[AccountInfo],
    jupiter_program: Program<'info, Jupiter>,
    data: Vec<u8>,
) -> ProgramResult {
    let accounts: Vec<AccountMeta> = remaining_accounts
        .iter()
        .map(|acc| AccountMeta {
            pubkey: *acc.key,
            is_signer: acc.is_signer,
            is_writable: acc.is_writable,
        })
        .collect();

    let accounts_infos: Vec<AccountInfo> = remaining_accounts
        .iter()
        .map(|acc| AccountInfo { ..acc.clone() })
        .collect();

    // TODO: Check the first 8 bytes. Only Jupiter Route CPI allowed.

    invoke_signed(
        &Instruction {
            program_id: *jupiter_program.key,
            accounts,
            data,
        },
        &accounts_infos,
        &[],
    )
}

fn create_wsol_token_idempotent<'info>(
    user_account: Signer<'info>,
    program_authority: SystemAccount<'info>,
    program_wsol_account: UncheckedAccount<'info>,
    sol_mint: Account<'info, Mint>,
    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
    authority_bump: &[u8],
    wsol_bump: &[u8],
) -> Result<TokenAccount> {
    if program_wsol_account.data_is_empty() {
        let signer_seeds: &[&[&[u8]]] = &[
            &[AUTHORITY_SEED, authority_bump.as_ref()],
            &[WSOL_SEED, wsol_bump.as_ref()],
        ];

        let user_lamports: u64 = user_account.lamports();
        let sol = user_lamports as f64 / LAMPORTS_PER_SOL as f64;
        msg!("Pubkey {} has {} Lamports is {} SOL",user_account.key, user_lamports, sol);

        msg!("---- Initialize program wSOL account ----");
        let rent = Rent::get()?;
        let space = TokenAccount::LEN;
        let lamports = rent.minimum_balance(space);
        system_program::create_account(
            CpiContext::new_with_signer(
                system_program.to_account_info(),
                system_program::CreateAccount {
                    from: user_account.to_account_info(),
                    to: program_wsol_account.to_account_info(),
                },
                signer_seeds,
            ),
            lamports,
            space as u64,
            token_program.key,
        )?;

        msg!("Initialize program wSOL token account");
        token::initialize_account3(CpiContext::new(
            token_program.to_account_info(),
            token::InitializeAccount3 {
                account: program_wsol_account.to_account_info(),
                mint: sol_mint.to_account_info(),
                authority: program_authority.to_account_info(),
            },
        ))?;

        let data = program_wsol_account.try_borrow_data()?;
        let wsol_token_account = TokenAccount::try_deserialize(&mut data.as_ref())?;

        Ok(wsol_token_account)
    } else {
        let data = program_wsol_account.try_borrow_data()?;
        let wsol_token_account = TokenAccount::try_deserialize(&mut data.as_ref())?;
        if &wsol_token_account.owner != program_authority.key {
            // TODO: throw error
            return err!(ErrorCode::IncorrectOwner);
        }

        Ok(wsol_token_account)
    }
}

fn close_program_wsol<'info>(
    program_authority: SystemAccount<'info>,
    program_wsol_account: UncheckedAccount<'info>,
    token_program: Program<'info, Token>,
    authority_bump: &[u8],
) -> Result<()> {
    let signer_seeds: &[&[&[u8]]] = &[&[AUTHORITY_SEED, authority_bump.as_ref()]];

    msg!("Close program wSOL token account");
    token::close_account(CpiContext::new_with_signer(
        token_program.to_account_info(),
        token::CloseAccount {
            account: program_wsol_account.to_account_info(),
            destination: program_authority.to_account_info(),
            authority: program_authority.to_account_info(),
        },
        signer_seeds,
    ))
}

#[derive(Accounts)]
pub struct SwapToSOL<'info> {
    #[account(mut, seeds = [AUTHORITY_SEED], bump)]
    pub program_authority: SystemAccount<'info>,
    /// CHECK: This may not be initialized yet.
    #[account(mut, seeds = [WSOL_SEED], bump)]
    pub program_wsol_account: UncheckedAccount<'info>,
    pub user_account: Signer<'info>,
    #[account(address = spl_token::native_mint::id())]
    pub sol_mint: Account<'info, Mint>,
    
    /// CHECK: Just program ID for inscription program.
    #[account(mut)]
    pub inscription_account: UncheckedAccount<'info>,
    /// CHECK: Just program ID for inscription program.
    #[account(mut)]
    pub inscription_metadata_account: UncheckedAccount<'info>,

    pub jupiter_program: Program<'info, Jupiter>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    /// CHECK: Just program ID for inscription program.
    #[account(address = MPL_INSCRIPTION_ID)]
    pub mpl_inscription_program: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct SOLToSwap<'info> {
    #[account(mut, seeds = [AUTHORITY_SEED], bump)]
    pub program_authority: SystemAccount<'info>,
    /// CHECK: This may not be initialized yet.
    #[account(mut, seeds = [WSOL_SEED], bump)]
    pub program_wsol_account: UncheckedAccount<'info>,
    pub user_account: Signer<'info>,
    #[account(address = spl_token::native_mint::id())]
    pub sol_mint: Account<'info, Mint>,
    pub jupiter_program: Program<'info, Jupiter>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
