import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Counter } from "../target/types/counter";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { createMint, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";

describe("counter", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());


  const program = anchor.workspace.Counter as Program<Counter>;
  const provider = anchor.getProvider()

  const token_decimal = 1_000_000

  const signer = Keypair.generate();
  const [counter,bump] = PublicKey.findProgramAddressSync([Buffer.from("counter"), signer.publicKey.toBuffer()], program.programId);
  


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

  it("Request Airdrop", async () => {
    // Add your test here.
    const tx = await provider.connection.requestAirdrop(
      signer.publicKey,
      LAMPORTS_PER_SOL * 100  // 100 SOL
    )
    .then(confirm)
    .then(log)
    
  });

  it("Init", async () => {

    const tx = await program.methods
      .initialize()
      .accounts({
        counter,
        signer: signer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId
      })
      .signers([signer])
      .rpc()
      .then(confirm)
      .then(log)
    
      console.log(`Signer pubkey: ${signer.publicKey})`)
      console.log(`vote pubkey: ${counter})`)
      console.log(`System program: ${anchor.web3.SystemProgram.programId})`)
    console.log(`bump: ${bump})`)
    
    const count = await program.account.counter.fetch(counter);
    console.log(`Count num: ${count.counterNum}`)
  });

  it("Counter increment", async () => {

    const tx = await program.methods
      .count(new anchor.BN(100))
      .accounts({
        counter,
        signer: signer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId
      })
      .signers([signer])
      .rpc()
      .then(confirm)
      .then(log)
    
      console.log(`Signer pubkey: ${signer.publicKey})`)
      console.log(`vote pubkey: ${counter})`)
      console.log(`System program: ${anchor.web3.SystemProgram.programId})`)
      console.log(`bump: ${bump})`)
    
      const count = await program.account.counter.fetch(counter);
      console.log(`Count num: ${count.counterNum}`)
      
    
  });

  it("Counter decrement", async () => {

    const tx = await program.methods
      .count(new anchor.BN(-10))
      .accounts({
        counter,
        signer: signer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId
      })
      .signers([signer])
      .rpc()
      .then(confirm)
      .then(log)
    
      console.log(`Signer pubkey: ${signer.publicKey})`)
      console.log(`vote pubkey: ${counter})`)
      console.log(`System program: ${anchor.web3.SystemProgram.programId})`)
      console.log(`bump: ${bump})`)
    
      const count = await program.account.counter.fetch(counter);
      console.log(`Count num: ${count.counterNum}`)
      
    
  });

  it("Check Counter", async () => {

    const mint = await createMint(anchor.getProvider().connection, signer, counter, null, 6)
    const ata = await getOrCreateAssociatedTokenAccount(anchor.getProvider().connection, signer, mint, signer.publicKey)
    
    const token_program= new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
    
    const tx = await program.methods
      .checkCounter()
      .accounts({
        signer:signer.publicKey,
        counter,
        mint,
        ata: ata.address,
        tokenProgram: token_program
      })
      .signers([signer])
      .rpc()
      .then(confirm)
      .then(log)
    
  });
});
