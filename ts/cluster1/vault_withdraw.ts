import {
    Connection,
    Keypair,
    SystemProgram,
    PublicKey,
    Commitment,
    LAMPORTS_PER_SOL
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
  
  // Import our keypair from the wallet file
  const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));
  
  // Commitment
  const commitment: Commitment = "confirmed";
  
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
  const vaultAuth = findProgramAddressSync([Buffer.from("auth"),vaultState.toBuffer()], program.programId)[0];
  
  // Create the vault key
// const vault = ???
  const vault = findProgramAddressSync([Buffer.from("vault"),vaultAuth.toBuffer()], program.programId)[0];

  
  // Execute our enrollment transaction
  (async () => {
    try {
      const signature = await program.methods
      .withdraw(new BN(1*LAMPORTS_PER_SOL))
      .accounts({
        owner: keypair.publicKey,
        vaultState,
        vaultAuth,
        vault,
        systemProgram: SystemProgram.programId
      })
      .signers([
          keypair
      ]).rpc();
      console.log(`Withdraw success! Check out your TX here:\n\nhttps://explorer.solana.com/tx/${signature}?cluster=devnet`);
    } catch (e) {
      console.error(`Oops, something went wrong: ${e}`);
    }
  })();