import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Escrow } from "../target/types/escrow";
import { Commitment, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { createMint, createAccount, mintTo, getOrCreateAssociatedTokenAccount, Account, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token"

const commitment: Commitment = "confirmed"

describe("escrow", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();
  const program = anchor.workspace.Escrow as Program<Escrow>;

  const [maker, taker] = [new Keypair(), new Keypair()];
  const escrow_pda = PublicKey.findProgramAddressSync([Buffer.from("escrow"), maker.publicKey.toBytes()], program.programId)[0];
  const vault_pda = PublicKey.findProgramAddressSync([Buffer.from("vault"), escrow_pda.toBuffer()], program.programId)[0];

   // Mints
  let maker_mint: PublicKey;
  let taker_mint: PublicKey;

   // ATAs
   let maker_ata: PublicKey; // maker mint + maker
   let maker_reciever_ata: PublicKey; // taker mint + maker
   let taker_ata: PublicKey; // taker mint + taker
   let taker_reciever_ata: PublicKey; // maker mint + taker
   let vault_ata: PublicKey; //maker mint + vault_pda only storing maker token so it can be sent back to taker once taker deposits to maker 
  
  const token_decimals = 6;
  
  it("Airdrop", async () => {
    await Promise.all([maker, taker].map(async (k) => {
      await provider.connection.requestAirdrop(k.publicKey, 100 * anchor.web3.LAMPORTS_PER_SOL).then(confirm).then(log);
    }))
  });

  it("Minting tokens", async () => {
  
    maker_mint = await createMint(provider.connection, maker, maker.publicKey, null, token_decimals)
    taker_mint = await createMint(provider.connection, taker, taker.publicKey,null, token_decimals)

    maker_ata = (await getOrCreateAssociatedTokenAccount(provider.connection, maker, maker_mint, maker.publicKey)).address
    maker_reciever_ata = (await getOrCreateAssociatedTokenAccount(provider.connection, maker, taker_mint, maker.publicKey)).address

    taker_ata = (await getOrCreateAssociatedTokenAccount(provider.connection, taker, taker_mint, taker.publicKey)).address
    taker_reciever_ata = (await getOrCreateAssociatedTokenAccount(provider.connection, taker, maker_mint, taker.publicKey)).address

    vault_ata = (await getOrCreateAssociatedTokenAccount(provider.connection, maker, maker_mint, escrow_pda, true)).address
    
    await mintTo(provider.connection, maker, maker_mint, maker_ata, maker, 1000 * token_decimals).then(confirm).then(log);
    await mintTo(provider.connection, taker, taker_mint, taker_ata, taker, 1000 * token_decimals).then(confirm).then(log);
    //await mintTo(provider.connection, maker, taker_mint, maker_reciever_ata, maker, 1000 * token_decimals).then(confirm).then(log);
    //await mintTo(provider.connection, taker, maker_mint, taker_reciever_ata, taker, 1000 * token_decimals).then(confirm).then(log);
   
  })

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods
    .initializeMake()
    .accounts({
      maker: maker.publicKey,
      makerMint: maker_mint,
      takerMint: taker_mint,
      escrow: escrow_pda,
      vault:vault_ata,
      makerAta: maker_ata,
      systemProgram: anchor.web3.SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .signers([maker])
      .rpc()
    .then(confirm)
    .then(log)
    
    console.log("Your transaction signature", tx);

    const vault_balance = (await provider.connection.getTokenAccountBalance(vault_ata)).value.amount;
    const maker_balance = (await provider.connection.getTokenAccountBalance(maker_ata)).value.amount;
    

    console.log(`Vault baalnce: ${vault_balance} == ${new anchor.BN(1000)}`)
    console.log(`Maker balance: ${maker_balance} == ${new anchor.BN(5000)}`)

  });

  it("Taker transfer to Maker !", async () => {
    // Add your test here.
    const tx = await program.methods
    .depositToMaker()
      .accounts({
      taker: taker.publicKey,
      maker: maker.publicKey,
      makerMint: maker_mint,
      takerMint: taker_mint,
      makerRecieverAta: maker_reciever_ata,
      takerAta: taker_ata,
      systemProgram: anchor.web3.SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .signers([taker])
      .rpc()
    .then(confirm)
    .then(log)
    
    console.log("Your transaction signature", tx);

    const maker_receiver_balance = (await provider.connection.getTokenAccountBalance(maker_reciever_ata)).value.amount;
    const taker_balance = (await provider.connection.getTokenAccountBalance(taker_ata)).value.amount;


    console.log(`Maker Reciever: ${maker_receiver_balance} == ${new anchor.BN(2000)}`)
    console.log(`Taker: ${taker_balance} == ${new anchor.BN(4000)}`)
    
  });

  it("Taker - Vault to Maker !", async () => {
    // Add your test here.
    const tx = await program.methods
    .take()
      .accounts({
      taker: taker.publicKey,
      maker: maker.publicKey,
      makerMint: maker_mint,
      takerReceiverAta: taker_reciever_ata,
      vault: vault_ata,
      escrow: escrow_pda,
      systemProgram: anchor.web3.SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .signers([taker])
      .rpc()
    .then(confirm)
    .then(log)
    
    console.log("Your transaction signature", tx);

    const maker_balance = (await provider.connection.getTokenAccountBalance(maker_reciever_ata)).value.amount;
    const vault_balance = (await provider.connection.getTokenAccountBalance(vault_ata)).value.amount;


    console.log(`Maker: ${maker_balance} == ${new anchor.BN(2000)}`)
    console.log(`Vault balance: ${vault_balance} == ${new anchor.BN(0)}`)
    
  });

  it("Close Vault !", async () => {
    // Add your test here.
    const tx = await program.methods
    .closeVault()
      .accounts({
      taker: taker.publicKey,
      maker: maker.publicKey,
      makerMint: maker_mint,
      takerReceiverAta: taker_reciever_ata,
      vault: vault_ata,
      escrow: escrow_pda,
      systemProgram: anchor.web3.SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .signers([taker])
      .rpc()
    .then(confirm)
    .then(log)
    
    console.log("Your transaction signature", tx);

    const maker_balance = (await provider.connection.getTokenAccountBalance(maker_reciever_ata)).value.amount;
    const vault_balance = (await provider.connection.getTokenAccountBalance(vault_ata)).value.amount;


    console.log(`Maker: ${maker_balance} == ${new anchor.BN(2000)}`)
    console.log(`Vault balance: ${vault_balance} == ${new anchor.BN(0)}`)
    
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
  