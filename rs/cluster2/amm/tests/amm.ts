import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Amm } from "../target/types/amm";
import { Commitment, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { createMint, createAccount, mintTo, getOrCreateAssociatedTokenAccount, Account, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token"
import { randomBytes } from "crypto";
import { findProgramAddressSync } from "@project-serum/anchor/dist/cjs/utils/pubkey";
import { use } from "chai";

const commitment: Commitment = "confirmed"

describe("AMM", () => {
  // Configure the client to use the local cluster.
  
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Amm as Program<Amm>;

  const seed = new anchor.BN(randomBytes(8));
  let fee: number = 100;//1%

  let lp_recieve_amt = new anchor.BN(1000);
  let x_max = new anchor.BN(1200);
  let y_max = new anchor.BN(1200);
  let x_min = new anchor.BN(1100);
  let y_min = new anchor.BN(1100);
  let expiration = new anchor.BN(221100);
  
  const user = new Keypair();
  const config = findProgramAddressSync([Buffer.from("config"), seed.toBuffer('le', 8)], program.programId)[0];
  const lp_mint_pda = findProgramAddressSync([Buffer.from("lp"), config.toBuffer()], program.programId)[0];
  const auth = findProgramAddressSync([Buffer.from("auth")], program.programId)[0];
  
   // Mints
  let mintX: PublicKey;
  let mintY: PublicKey;
  let mintLp: PublicKey;

   // ATAs
   let userXToken: PublicKey; 
   let userYToken: PublicKey;
   let userLpToken: PublicKey; 
   let vaultXToken: PublicKey;
   let vaultYToken: PublicKey; 
  
  const token_decimals = 6;
  
  it("Airdrop", async () => {
    await Promise.all([user].map(async (k) => {
      await provider.connection.requestAirdrop(k.publicKey, 100 * anchor.web3.LAMPORTS_PER_SOL).then(confirm).then(log);
    }))
  });

  it("Minting tokens", async () => {
  
    mintX = await createMint(provider.connection, user, user.publicKey, null, token_decimals)
    mintY = await createMint(provider.connection, user, user.publicKey, null, token_decimals)
    mintLp = await createMint(provider.connection, user, user.publicKey, null, token_decimals)

    userXToken = (await getOrCreateAssociatedTokenAccount(provider.connection, user, mintX, user.publicKey)).address
    userYToken = (await getOrCreateAssociatedTokenAccount(provider.connection, user, mintY, user.publicKey)).address
    userLpToken = (await getOrCreateAssociatedTokenAccount(provider.connection, user, mintLp, user.publicKey)).address

    vaultXToken = (await getOrCreateAssociatedTokenAccount(provider.connection, user, mintX, auth, true)).address
    vaultYToken = (await getOrCreateAssociatedTokenAccount(provider.connection, user, mintY, auth, true)).address
    
    //We dont mint to vault lp b/c we can directly mint to user account in RUST
    //We dont mint to valutX or Y token b/c the user will send them. 
    //We also dont mint to userLpToken since only the vault do that in rust
    await mintTo(provider.connection, user, mintX, userXToken, user, 10000 * token_decimals).then(confirm).then(log);
    await mintTo(provider.connection, user, mintY, userYToken, user, 10000 * token_decimals).then(confirm).then(log);

    //await mintTo(provider.connection, user, mintX, vaultXToken, auth, 10000 * token_decimals).then(confirm).then(log);
    //await mintTo(provider.connection, user, mintY, vaultYToken, auth, 10000 * token_decimals).then(confirm).then(log);

    //await mintTo(provider.connection, user, mintLp, vaultYToken, auth, 10000 * token_decimals).then(confirm).then(log);
   
  })

  it("Init AMM .....!", async () => {
    await program.methods.initialize(seed,fee, user.publicKey)//user.Publikey is just an authority to be saved in config(to update fees later). Not auth of PDA
      .accounts({
        config,
        auth,
        initializer: user.publicKey,
        mintX,
        mintY,
        lpMint: lp_mint_pda,
        valutX: vaultXToken,
        valutY: vaultYToken,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      }).signers([user])
      .rpc()
      .then(confirm)
      .then(log);
  });

  xit("Provide liquidity .....!", async () => {
    await program.methods.deposit(lp_recieve_amt,x_max,y_max,expiration)//user.Publikey is just an authority to be saved in config(to update fees later). Not auth of PDA
      .accounts({
        config,
        auth,
        user: user.publicKey,
        mintX,
        mintY,
        lpMint: lp_mint_pda,
        vaultX: vaultXToken,
        vaultY: vaultYToken,
        userVaultX: userXToken,
        userVaultY: userYToken,
        userLpToken,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      }).signers([user])
      .rpc()
      .then(confirm)
      .then(log);
  });

  const confirm = async (signature: string): Promise<string>  => {
    const block = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
      signature,
      ...block
    });
  
    return signature;
  }
    
  const log = async (signature: string): Promise<string>  => {
    console.log(`Your tx signature: https://explorer.solana.com/transaction/${signature}?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899`);
  
    return signature;
  }
  
  
  });