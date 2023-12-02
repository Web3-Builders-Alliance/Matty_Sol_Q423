import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AnchorVault } from "../target/types/anchor_vault";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
const program = anchor.workspace.AnchorVault as Program<AnchorVault>;

const connection = anchor.getProvider().connection;

const signer = Keypair.generate();

const vault = PublicKey.findProgramAddressSync([Buffer.from("vault"), signer.publicKey.toBuffer()], program.programId)[0];

const confirm = async (signature: string): Promise<string> => {
  const block = await connection.getLatestBlockhash();
  await connection.confirmTransaction({
    signature,
    ...block
  })
  return signature
}

  const log = async(signature: string): Promise<string> => {
    console.log(`Your transaction signature: https://explorer.solana.com/transaction/${signature}?cluster=custom&customUrl=${connection.rpcEndpoint}`);
    return signature;
  }


  it("Airdrop", async () => {
    await connection.requestAirdrop(signer.publicKey, LAMPORTS_PER_SOL * 10)
    .then(confirm)
    .then(log)
  })

  it("Deposit", async () => {
    await program.methods.deposit(new anchor.BN(1000000000)).accounts({
      signer: signer.publicKey,
      vault,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
      .signers([signer])
      .rpc()
    .then(confirm)
    .then(log)
  })

  it("Withdraw", async () => {
    await program.methods.withdraw(new anchor.BN(1000000000)).accounts({
      signer: signer.publicKey,
      vault,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
      .signers([signer])
      .rpc()
    .then(confirm)
    .then(log)
  })