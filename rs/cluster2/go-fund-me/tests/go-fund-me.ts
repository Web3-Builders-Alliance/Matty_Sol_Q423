import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { GoFundMe } from "../target/types/go_fund_me";
import { Commitment, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { createMint, createAccount, mintTo, getOrCreateAssociatedTokenAccount, Account, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token"

const commitment: Commitment = "confirmed"

describe("go-fund-me \n",  async () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const connection = new Connection("https://api.devnet.solana.com", commitment);

  const program = anchor.workspace.GoFundMe as Program<GoFundMe>;
  const provider = anchor.getProvider()

  //keys
  const [fundraiser, donor] = [new Keypair(), new Keypair()];

  //PDAs
  const escrow_pda = PublicKey.findProgramAddressSync([Buffer.from("escrow"), fundraiser.publicKey.toBuffer()], program.programId)[0];
  const vault_pda = PublicKey.findProgramAddressSync([Buffer.from("vault"), escrow_pda.toBuffer()], program.programId)[0];

  // Mints
  let mint_token: PublicKey;

  // ATAs
  let fundraiser_ata: Account; // Fundraiser + mint_token
  let donor_ata: Account; // Donor + mint token
  let vault_ata: Account; // vault pda + mint token

  it("Airdrop", async () => {
    await Promise.all([fundraiser, donor].map(async (k) => {
      await anchor.getProvider().connection.requestAirdrop(k.publicKey, 100 * anchor.web3.LAMPORTS_PER_SOL).then(confirm).then(log);
    }))
  });

  it("Mint maker/taker tokens", async () => {
    // Create mints and ATAs
    mint_token = await createMint(anchor.getProvider().connection, fundraiser, fundraiser.publicKey, null, 6)

    fundraiser_ata = await getOrCreateAssociatedTokenAccount(anchor.getProvider().connection, fundraiser, mint_token, fundraiser.publicKey)

    donor_ata = await getOrCreateAssociatedTokenAccount(anchor.getProvider().connection, fundraiser, mint_token, donor.publicKey)

    vault_ata = await getOrCreateAssociatedTokenAccount(anchor.getProvider().connection, fundraiser, mint_token, escrow_pda,true)
  })

  it("Init Go Fund Escrow!", async () => {
    // Add your test here.
    const tx = await program.methods
    .initializeCampaign()
    .accounts({
      fundraiser: fundraiser.publicKey,
      tokenMint: mint_token,
      escrow: escrow_pda,
      fundraiserAta: fundraiser_ata.address,
      vault: vault_pda,
      systemProgram: anchor.web3.SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .signers([fundraiser])
    .rpc()
    .then(confirm)
    .then(log)
    
    const esc = await program.account.campaignEscrow.fetch(escrow_pda);
    console.log(`Goal amount num: ${esc.goalAmount.toNumber()}`)

    console.log(`Goal amount num: ${esc.escrowBump}`)
    console.log(`Goal amount num: ${esc.fundraiserAta} == ${fundraiser_ata.address}`)
    
  });

  it("Donate ", async () => {
    const tx = await program.methods
    .donate(new anchor.BN(1000000000))
      .accounts({
        donor: donor.publicKey,
        escrow: escrow_pda,
        vault: vault_ata.address,
        donorAta: donor_ata.address,
        tokenMint: mint_token,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .signers([donor])
    .rpc()
    .then(confirm)
      .then(log)
    
    const vault = await program.account.campaignEscrow.fetch(vault_ata.address);

    console.log(`Donated: ${vault} == ${new anchor.BN(1000000000)}`)
    
  });

 // Helpers

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
