import { Keypair, Connection, Commitment } from "@solana/web3.js";
import { createMint } from '@solana/spl-token';
import wallet from "../wba-wallet.json"
//PK 5xb4XeuuCSETmUTeZE3JcPdVqxd6jfZsSNYVNt2BUJYzqzQ2YXiXT5uodnxC5e44Q7xKEXqqGkBSpnaH6TYEvuew
//mint id GXWDj8NGR7GAH7Rm1i1MLCkC6NmZNh68FBKhPZJm5mQ1
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

//Create a Solana devnet connection
const commitment: Commitment = "confirmed";
const connection = new Connection("https://api.devnet.solana.com", commitment);

(async () => {
    try {
        // Start here
        const mint = await createMint(connection, keypair, keypair.publicKey, keypair.publicKey, 6, undefined)
        console.log(`Mint address: ${mint}`)
    } catch(error) {
        console.log(`Oops, something went wrong: ${error}`)
    }
})()
