import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { GoFundMe } from "../target/types/go_fund_me";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { createMint, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import { BN } from "bn.js";

describe("go-fund-me \n",  async () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.GoFundMe as Program<GoFundMe>;
  const provider = anchor.getProvider()

  const fundraiser = Keypair.generate();
  const donor = Keypair.generate();

  const escrow = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), fundraiser.publicKey.toBuffer()], program.programId)[0];
  
  const vault = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), escrow.toBuffer()], program.programId)[0];
  
  let mint =null;

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
      fundraiser.publicKey,
      LAMPORTS_PER_SOL * 100  // 10 SOL
    )
    .then(confirm)
    .then(log)
    
    
  });
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  it("Init Go Fund Escrow!", async () => {
    // Add your test here.

    mint = await createMint(anchor.getProvider().connection, fundraiser, escrow,null, 6);
    //const donor_ata = await getOrCreateAssociatedTokenAccount(anchor.getProvider().connection, fundraiser, mint, donor.publicKey)

    const fundraiser_ata = await getOrCreateAssociatedTokenAccount(anchor.getProvider().connection, fundraiser, mint, fundraiser.publicKey)

    const campaign_escrow_ata = await getOrCreateAssociatedTokenAccount(anchor.getProvider().connection, fundraiser, mint, escrow,true)

    const tx = await program.methods
    .initializeCampaign()
    .accounts({
      fundraiser: fundraiser.publicKey,
      tokenMint: mint,
      escrow: escrow,
      fundraiserAta: fundraiser_ata.address,
      vault: vault,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([fundraiser])
    .rpc()
    .then(confirm)
      .then(log)
    
    const esc = await program.account.campaignEscrow.fetch(escrow);
    console.log(`Goal amount num: ${esc.goalAmount.toNumber()}`)

    console.log(`Goal amount num: ${esc.escrowBump}`)
    console.log(`Goal amount num: ${esc.fundraiserAta} == ${fundraiser_ata.address}`)
    
  });

  it("Donate ", async () => {
    // Add your test here.

    //const mint = await createMint(anchor.getProvider().connection, fundraiser, escrow,null, 6);

    const donor_ata = await getOrCreateAssociatedTokenAccount(anchor.getProvider().connection, fundraiser, mint, donor.publicKey)

    //const fundraiser_ata = await getOrCreateAssociatedTokenAccount(anchor.getProvider().connection, fundraiser, mint, fundraiser.publicKey)

    const campaign_escrow_ata = await getOrCreateAssociatedTokenAccount(anchor.getProvider().connection, fundraiser, mint, escrow,true)

    const tx = await program.methods
    .donate(new anchor.BN(1000000000))
      .accounts({
        donor: donor.publicKey,
        escrow: escrow,
        vault: vault,
        donorAta: donor_ata.address,
        tokenMint: mint,
    })
    .signers([donor])
    .rpc()
    .then(confirm)
      .then(log)
    
    const v = await program.account.campaignEscrow.fetch(vault);

    console.log(`Donated: ${vault} == ${new anchor.BN(1000000000)}`)
    
  });

});
