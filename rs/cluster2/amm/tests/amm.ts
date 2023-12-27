import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Amm } from "../target/types/amm";
import { Commitment, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { createMint, createAccount, mintTo, getOrCreateAssociatedTokenAccount, Account, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token"
import { randomBytes } from "crypto";
import { findProgramAddressSync } from "@project-serum/anchor/dist/cjs/utils/pubkey";

const commitment: Commitment = "confirmed"

describe("escrow", () => {
  // Configure the client to use the local cluster.
  
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Escrow as Program<Amm>;

  const seed = new anchor.BN(randomBytes(8));
  
  const user = new Keypair();
  const config = findProgramAddressSync([Buffer.from("config"),seed.toBuffer('le', 8)], program.programId)[0];
  
   // Mints
  let mintX: PublicKey;
  let mintY: PublicKey;
  let mintLp: PublicKey;

   // ATAs
   let userXToken: PublicKey; // maker mint + maker
   let userYToken: PublicKey; // taker mint + maker
   let userLpToken: PublicKey; // taker mint + taker
   let vaultXToken: PublicKey; // maker mint + taker
   let vaultYToken: PublicKey; //maker mint + vault_pda only storing maker token so it can be sent back to taker once taker deposits to maker 
  
  const token_decimals = 6;
  
  it("Airdrop", async () => {
    await Promise.all([user].map(async (k) => {
      await provider.connection.requestAirdrop(k.publicKey, 100 * anchor.web3.LAMPORTS_PER_SOL).then(confirm).then(log);
    }))
  });

  // it("Minting tokens", async () => {
  
  //   mint_x = await createMint(provider.connection, maker, maker.publicKey, null, token_decimals)
  //   mint_y = await createMint(provider.connection, taker, taker.publicKey,null, token_decimals)

  //   makerXAta = (await getOrCreateAssociatedTokenAccount(provider.connection, maker, mint_x, maker.publicKey)).address
  //   makerYAta = (await getOrCreateAssociatedTokenAccount(provider.connection, maker, mint_y, maker.publicKey)).address

  //   takerXAta = (await getOrCreateAssociatedTokenAccount(provider.connection, taker, mint_x, taker.publicKey)).address
  //   takerYAta = (await getOrCreateAssociatedTokenAccount(provider.connection, taker, mint_y, taker.publicKey)).address

  //   vault_ata = (await getAssociatedTokenAddressSync(mint_x, escrow_pda, true));
    
  //   await mintTo(provider.connection, maker, mint_x, makerXAta, maker, 10000 * token_decimals).then(confirm).then(log);
  //   await mintTo(provider.connection, taker, mint_y, takerYAta, taker, 10000 * token_decimals).then(confirm).then(log);
   
  // })

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