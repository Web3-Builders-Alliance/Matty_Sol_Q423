import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Amm } from "../target/types/amm";
import { Commitment, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { createMint, createAccount, mintTo, getOrCreateAssociatedTokenAccount, Account, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token"
import { randomBytes } from "crypto";
import { findProgramAddressSync } from "@project-serum/anchor/dist/cjs/utils/pubkey";
import { use } from "chai";
import { getAccount } from "@solana/spl-token";

describe("AMM", () => {
  // Configure the client to use the local cluster.
  
  const provider = anchor.AnchorProvider.env();
  const connection = provider.connection;

  anchor.setProvider(provider);

  const program = anchor.workspace.Amm as Program<Amm>;

  const seed = new anchor.BN(randomBytes(8));
  let fee: number = 100;//1%
  let updatedFee: number = 110;//1%

  let lp_recieve_amt = new anchor.BN(1000);
  let x_max = new anchor.BN(14000);
  let y_max = new anchor.BN(16000);
  let x_min = new anchor.BN(10000);
  let y_min = new anchor.BN(8000);
  
  const user = new Keypair();
  const config = findProgramAddressSync([Buffer.from("config"), seed.toBuffer().reverse()], program.programId)[0];
  const lp_mint_pda = findProgramAddressSync([Buffer.from("lp"), config.toBuffer()], program.programId)[0];
  const auth = findProgramAddressSync([Buffer.from("auth")], program.programId)[0];
  
   // Mints
  let mintX: PublicKey;
  let mintY: PublicKey;
  //let mintLp: PublicKey;

   // ATAs
   let userXToken: PublicKey; 
   let userYToken: PublicKey;
   let userLpToken: PublicKey; 
   let vaultXToken: PublicKey;
   let vaultYToken: PublicKey; 
  
  const token_decimals = 6;

  const currentUnixTimestamp = Math.floor(Date.now() / 1000);
  let expiration = new anchor.BN(currentUnixTimestamp);


  
  it("Airdrop", async () => {
    await Promise.all([user].map(async (k) => {
      await connection.requestAirdrop(k.publicKey, 100 * anchor.web3.LAMPORTS_PER_SOL).then(confirm).then(log);
    }))
  });

  it("Minting tokens", async () => {
  
    mintX = await createMint(connection, user, user.publicKey, null, token_decimals)
    mintY = await createMint(connection, user, user.publicKey, null, token_decimals)
    //mintLp = await createMint(connection, user, auth, null, token_decimals)

    userXToken = (await getOrCreateAssociatedTokenAccount(connection, user, mintX, user.publicKey)).address
    userYToken = (await getOrCreateAssociatedTokenAccount(connection, user, mintY, user.publicKey)).address
    userLpToken = getAssociatedTokenAddressSync(lp_mint_pda,user.publicKey,false)

    vaultXToken = (await getOrCreateAssociatedTokenAccount(connection, user, mintX, auth, true)).address
    vaultYToken = (await getOrCreateAssociatedTokenAccount(connection, user, mintY, auth, true)).address
    
    //We dont mint to vault lp b/c we can directly mint to user account in RUST
    //We dont mint to valutX or Y token b/c the user will send them. 
    //We also dont mint to userLpToken since only the vault do that in rust
    await mintTo(connection, user, mintX, userXToken, user, 20000 * token_decimals).then(confirm).then(log);
    await mintTo(connection, user, mintY, userYToken, user, 10000 * token_decimals).then(confirm).then(log);

    const userXTokenAmount = await getAccount(connection, userXToken);
    const userYTokenAmount = await getAccount(connection, userYToken);
    //const userLpAmount = await getAccount(connection, userLpToken);
    const vaultXTokenAmount = await getAccount(connection, vaultXToken);
    const vaultYTokenAmount = await getAccount(connection, vaultYToken);
    
    console.log("userXTokenAmount: ", userXTokenAmount.amount);
    console.log("userYTokenAmount: ", userYTokenAmount.amount);
    //console.log("userLpAmount: ", userLpAmount.amount);
    console.log("vaultXTokenAmount: ", vaultXTokenAmount.amount);
    console.log("vaultYTokenAmount: ", vaultYTokenAmount.amount);

   
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
    
    //const configObj = await getAccount(connection, userYToken);
    const configObj = await connection.getAccountInfo(config);
    const data = Buffer.from(configObj.data).toString();//TODO Deserlalize 


      console.log("Config obj: ", data);
  });

  it("Update Fee .....!", async () => {
    await program.methods.updateFee(updatedFee)//user.Publikey is just an authority to be saved in config(to update fees later). Not auth of PDA
      .accounts({
        signer: user.publicKey,
        config
      }).signers([user])
      .rpc()
      .then(confirm)
      .then(log);
  });

  it("Provide liquidity .....!", async () => {
    await program.methods.deposit(lp_recieve_amt,x_max,y_max,expiration)//user.Publikey is just an authority to be saved in config(to update fees later). Not auth of PDA
      .accounts({
        user: user.publicKey,
        mintX,
        mintY,
        lpMint: lp_mint_pda,
        auth,
        config,
        vaultX: vaultXToken,
        userVaultX: userXToken,
        vaultY: vaultYToken,
        userVaultY: userYToken,
        userLpToken,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      }).signers([user])
      .rpc()
      .then(confirm)
      .then(log);
    
      const userXTokenAmount = await getAccount(connection, userXToken);
      const userYTokenAmount = await getAccount(connection, userYToken);
      const userLpAmount = await getAccount(connection, userLpToken);
      const vaultXTokenAmount = await getAccount(connection, vaultXToken);
      const vaultYTokenAmount = await getAccount(connection, vaultYToken);
    
      console.log("userXTokenAmount: ", userXTokenAmount.amount);
      console.log("userYTokenAmount: ", userYTokenAmount.amount);
      console.log("userLpAmount: ", userLpAmount.amount);
      console.log("vaultXTokenAmount: ", vaultXTokenAmount.amount);
      console.log("vaultYTokenAmount: ", vaultYTokenAmount.amount);
  });

  it("Withdraw liquidity .....!", async () => {
    await program.methods.withdraw(lp_recieve_amt,x_min,y_min,expiration)//user.Publikey is just an authority to be saved in config(to update fees later). Not auth of PDA
      .accounts({
        user: user.publicKey,
        lpMint: lp_mint_pda,
        mintX,
        mintY,
        userLpVault: userLpToken,
        userXVault: userXToken,
        userYVault: userYToken,
        lpXVault: vaultXToken,
        lpYVault: vaultYToken,
        auth,
        config,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      }).signers([user])
      .rpc()
      .then(confirm)
      .then(log);
    
      
      const userXTokenAmount = await getAccount(connection, userXToken);
      const userYTokenAmount = await getAccount(connection, userYToken);
      const userLpAmount = await getAccount(connection, userLpToken);
      const vaultXTokenAmount = await getAccount(connection, vaultXToken);
      const vaultYTokenAmount = await getAccount(connection, vaultYToken);
    
      console.log("userXTokenAmount: ", userXTokenAmount.amount);
      console.log("userYTokenAmount: ", userYTokenAmount.amount);
      console.log("userLpAmount: ", userLpAmount.amount);
      console.log("vaultXTokenAmount: ", vaultXTokenAmount.amount);
      console.log("vaultYTokenAmount: ", vaultYTokenAmount.amount);
  });

  const confirm = async (signature: string): Promise<string>  => {
    const block = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
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