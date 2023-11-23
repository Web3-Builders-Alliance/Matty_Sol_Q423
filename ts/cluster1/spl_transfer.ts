import { Commitment, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js"
import wallet from "../wba-wallet.json"
import { getOrCreateAssociatedTokenAccount, transfer } from "@solana/spl-token";

// We're going to import our keypair from the wallet file
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

//Create a Solana devnet connection
const commitment: Commitment = "confirmed";
const connection = new Connection("https://api.devnet.solana.com", commitment);

// Mint address
const mint = new PublicKey("GXWDj8NGR7GAH7Rm1i1MLCkC6NmZNh68FBKhPZJm5mQ1");

// Recipient address
const to = new PublicKey("GtnDGGPhZcnuk2DWSYt3PjnxiFs2w9k5FfT8zUuHtU8K");

(async () => {
    try {
        // Get the token account of the fromWallet address, and if it does not exist, create it
        let sender = await getOrCreateAssociatedTokenAccount(connection, keypair, mint, keypair.publicKey);

        // Get the token account of the toWallet address, and if it does not exist, create it
        let recipient = await getOrCreateAssociatedTokenAccount(connection, keypair, mint, to);

        // Transfer the new token to the "toTokenAccount" we just created
        let tx = await transfer(connection, keypair, sender.address, recipient.address, keypair, 1000, undefined);
        console.log(`Your transfer txid: ${tx}`);
        
    } catch(e) {
        console.error(`Oops, something went wrong: ${e}`)
    }
})();