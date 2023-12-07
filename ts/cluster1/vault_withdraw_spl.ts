import {
    Connection,
    Keypair,
    SystemProgram,
    PublicKey,
    Commitment,
  } from "@solana/web3.js";
  import {
    Program,
    Wallet,
    AnchorProvider,
    Address,
    BN,
  } from "@coral-xyz/anchor";
  import { WbaVault, IDL } from "../programs/wba_vault";
  import wallet from "../wba-wallet.json";
import { findProgramAddressSync } from "@project-serum/anchor/dist/cjs/utils/pubkey";
import { TOKEN_PROGRAM_ID, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import { ASSOCIATED_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";
  
  // Import our keypair from the wallet file
  const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));
  
  // Commitment
  const commitment: Commitment = "finalized";
  
  // Create a devnet connection
  const connection = new Connection("https://api.devnet.solana.com");
  
  // Create our anchor provider
  const provider = new AnchorProvider(connection, new Wallet(keypair), {
    commitment,
  });
  
  // Create our program
  const program = new Program<WbaVault>(IDL, "D51uEDHLbWAxNfodfQDv7qkp8WZtxrhi3uganGbNos7o" as Address, provider);
  
  // Create a random keypair
  const vaultState = new PublicKey("ym3uTRGw7H2ZoUqBHSNhmXMCxwk6cbJWwx4ZjBqKjyr");
   
// Create the PDA for our enrollment account
  const vaultAuth = findProgramAddressSync([Buffer.from("auth"),vaultState.toBuffer()], program.programId)[0];

// Create the vault key
  const vault = findProgramAddressSync([Buffer.from("vault"),vaultAuth.toBuffer()], program.programId)[0];

  const token_decimals = 6;
  
  const mint = new PublicKey("EjjVQYpTPZzcwgGWJ1k6NaD1Pq4AbZkU9Ke8FocWJij1");
  
    // Execute our enrollment transaction
    (async () => {
      try {

        //// Get the token account of the fromWallet address, and if it does not exist, create it
    const ownerAta = await getOrCreateAssociatedTokenAccount(connection,keypair,mint,keypair.publicKey)
    // Get the token account of the fromWallet address, and if it does not exist, create it
    const vaultAta = await getOrCreateAssociatedTokenAccount(
      connection,
      keypair,
      mint,
      vaultAuth,
      true,
      commitment,
    );
        const signature = await program.methods
        .withdrawSpl(new BN(20))
          .accounts({
            owner: keypair.publicKey,
            vaultState,
            vaultAuth,
            systemProgram: SystemProgram.programId,
            ownerAta: ownerAta.address,
            vaultAta: vaultAta.address,
            tokenMint: mint,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_PROGRAM_ID
        })
        .signers([
            keypair
        ]).rpc();
        console.log(`Withdraw success! Check out your TX here:\n\nhttps://explorer.solana.com/tx/${signature}?cluster=devnet`);
      } catch (e) {
        console.error(`Oops, something went wrong: ${e}`);
      }
    })();