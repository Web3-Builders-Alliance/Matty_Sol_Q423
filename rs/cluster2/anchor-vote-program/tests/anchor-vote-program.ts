import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AnchorVoteProgram } from "../target/types/anchor_vote_program";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { createHash} from "crypto";

describe("anchor-vote-program", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.AnchorVoteProgram as Program<AnchorVoteProgram>;

  const provider = anchor.getProvider();
  const signer = Keypair.generate();

  const site = "https://coral-xyz.github.io";
  const hash = createHash("sha256").update(site).digest();

  const vote = PublicKey.findProgramAddressSync([hash], program.programId)[0];
  

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

  it("AirDrop", async () => {
    const tx = await provider.connection.requestAirdrop(
      signer.publicKey,
      LAMPORTS_PER_SOL * 100  // 100 SOL
    )
     .then(confirm)
     .then(log)
    
  });

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods
      .initialize(site)
      .accounts({
        vote,
        signer: signer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([signer])
      .rpc()
      .then(confirm)
      .then(log)
      
  });


  it("Upvote!", async () => {
    // Add your test here.
    const tx = await program.methods
      .upvote(site)
      .accounts({
        vote,
        signer: signer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([signer])
      .rpc()
      .then(confirm)
      .then(log)
      
  });


  it("Downvote!", async () => {
    // Add your test here.
    const tx = await program.methods
      .downvote(site)
      .accounts({
        vote,
        signer: signer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([signer])
      .rpc()
      .then(confirm)
      .then(log)
      
  });
});
