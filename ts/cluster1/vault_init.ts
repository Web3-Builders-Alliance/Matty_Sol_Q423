import {
    Connection,
    Keypair,
    SystemProgram,
    PublicKey,
    Commitment,
  } from "@solana/web3.js";
  import { Program, Wallet, AnchorProvider, Address } from "@coral-xyz/anchor";
  import { WbaVault, IDL } from "../programs/wba_vault";
  import wallet from "../wba-wallet.json";
import { findProgramAddressSync } from "@project-serum/anchor/dist/cjs/utils/pubkey";
  /// J8qKEmQpadFeBuXAVseH8GNrvsyBhMT8MHSVD3enRgJz
  
  // Import our keypair from the wallet file
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));
console.log(`Wallet keypair: ${keypair.publicKey}`)  
  
  // Commitment
  const commitment: Commitment = "confirmed";
  
  // Create a devnet connection
  const connection = new Connection("https://api.devnet.solana.com");
  
  // Create our anchor provider
  const provider = new AnchorProvider(connection, new Wallet(keypair), {
    commitment,
  });
  
  // Create our program
  const program = new Program<WbaVault>(
    IDL,
    "D51uEDHLbWAxNfodfQDv7qkp8WZtxrhi3uganGbNos7o" as Address,
    provider,
  );

  console.log(`Program Id: ${program.programId}`) 
  
  // Create a random keypair
  const vaultState = Keypair.generate();
  console.log(`vaultState public key: ${vaultState.publicKey.toBase58()}`);

  // Create the PDA for our enrollment account
  // Seeds are "auth", vaultState
  const vault_seeds = [
    Buffer.from('auth'),
    vaultState.publicKey.toBuffer()
  ];
  const vaultAuth = findProgramAddressSync(vault_seeds, program.programId)[0];
  
  console.log(`vaultAuth: ${vaultAuth}`) 
  
  // Create the vault key
  // Seeds are "vault", vaultAuth
  const vault = findProgramAddressSync([Buffer.from("vault"), vaultAuth.toBuffer()], program.programId)[0];
  console.log(`Vault PDA: ${vault}`);
  // Execute our enrollment transaction
  (async () => {
    try {
      const signature = await program.methods.initialize()
      .accounts({
          owner: keypair.publicKey,
          vaultState: vaultState.publicKey,
          vaultAuth,
          vault,
          systemProgram: SystemProgram.programId
       }).signers([keypair, vaultState]).rpc();
    console.log(`Init success! Check out your TX here:\n\nhttps://explorer.solana.com/tx/${signature}?cluster=devnet`);
    } catch (e) {
      console.error(`Oops, something went wrong: ${e}`);
    }
  })();