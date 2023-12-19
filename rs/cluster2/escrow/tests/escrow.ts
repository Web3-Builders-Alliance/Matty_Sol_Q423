import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Escrow } from "../target/types/escrow";
import { Commitment, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { createMint, createAccount, mintTo, getOrCreateAssociatedTokenAccount, Account, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token"
import { randomBytes } from "crypto";
import { findProgramAddressSync } from "@project-serum/anchor/dist/cjs/utils/pubkey";

const commitment: Commitment = "confirmed"

describe("escrow", () => {
  // Configure the client to use the local cluster.
  
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Escrow as Program<Escrow>;

  const seed = new anchor.BN(randomBytes(8));
  
  const [maker, taker] = [new Keypair(), new Keypair()];
  const escrow_pda = findProgramAddressSync([Buffer.from("escrow"), maker.publicKey.toBuffer(),seed.toBuffer('le', 8)], program.programId)[0];

   // Mints
  let mint_x: PublicKey;
  let mint_y: PublicKey;

   // ATAs
   let makerXAta: PublicKey; // maker mint + maker
   let makerYAta: PublicKey; // taker mint + maker
   let takerYAta: PublicKey; // taker mint + taker
   let takerXAta: PublicKey; // maker mint + taker
   let vault_ata: PublicKey; //maker mint + vault_pda only storing maker token so it can be sent back to taker once taker deposits to maker 
  
  const token_decimals = 6;
  
  it("Airdrop", async () => {
    await Promise.all([maker, taker].map(async (k) => {
      await provider.connection.requestAirdrop(k.publicKey, 100 * anchor.web3.LAMPORTS_PER_SOL).then(confirm).then(log);
    }))
  });

  it("Minting tokens", async () => {
  
    mint_x = await createMint(provider.connection, maker, maker.publicKey, null, token_decimals)
    mint_y = await createMint(provider.connection, taker, taker.publicKey,null, token_decimals)

    makerXAta = (await getOrCreateAssociatedTokenAccount(provider.connection, maker, mint_x, maker.publicKey)).address
    makerYAta = (await getOrCreateAssociatedTokenAccount(provider.connection, maker, mint_y, maker.publicKey)).address

    takerXAta = (await getOrCreateAssociatedTokenAccount(provider.connection, taker, mint_x, taker.publicKey)).address
    takerYAta = (await getOrCreateAssociatedTokenAccount(provider.connection, taker, mint_y, taker.publicKey)).address

    vault_ata = (await getAssociatedTokenAddressSync(mint_x, escrow_pda, true));
    
    await mintTo(provider.connection, maker, mint_x, makerXAta, maker, 10000 * token_decimals).then(confirm).then(log);
    await mintTo(provider.connection, taker, mint_y, takerYAta, taker, 10000 * token_decimals).then(confirm).then(log);
   
  })

  it("Init Escrow and Make .....!", async () => {
    await program.methods.make(seed,new anchor.BN(1000), new anchor.BN(1000))
      .accounts({
        maker: maker.publicKey,
        mintX: mint_x,
        mintY: mint_y,
        makerXAta,
        makerYAta,
        escrowRecord: escrow_pda,
        vault: vault_ata,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      }).signers([maker])
      .rpc()
      .then(confirm)
      .then(log);

  });

  it("Take .....!", async () => {
    await program.methods.take()
      .accounts({
        taker:taker.publicKey,
        maker: maker.publicKey,
        mintX: mint_x,
        mintY: mint_y,
        makerYAta,
        takerYAta,
        takerXAta,
        escrowRecord: escrow_pda,
        vault: vault_ata,
        tokenProgram: TOKEN_PROGRAM_ID,
      }).signers([taker])
      .rpc()
      .then(confirm)
      .then(log);

  });

  it("Refund And Close .....!", async () => {
    await program.methods.refund()
      .accounts({
        maker: maker.publicKey,
        mintX: mint_x,
        makerXAta,
        escrowRecord: escrow_pda,
        vault: vault_ata,
        tokenProgram: TOKEN_PROGRAM_ID,
      }).signers([maker])
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