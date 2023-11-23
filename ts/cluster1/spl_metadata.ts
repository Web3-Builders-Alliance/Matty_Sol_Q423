import { Commitment, Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js"
import wallet from "../wba-wallet.json"
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { createMetadataAccountV3 } from "@metaplex-foundation/mpl-token-metadata";
import { createSignerFromKeypair, publicKey, signerIdentity, PublicKey as umiPublicKey } from "@metaplex-foundation/umi";

// Define our Mint address
const mint = new PublicKey("BAcMNxhBnbCUd8TnB3PXub6FZyU2fL3ykwzRV3JTwDwW")

// Add the Token Metadata Program
const token_metadata_program_id = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

// Create PDA for token metadata
const metadata_seeds = [
    Buffer.from('metadata'),
    token_metadata_program_id.toBuffer(),
    mint.toBuffer(),
];
const [metadata_pda, _bump] = PublicKey.findProgramAddressSync(metadata_seeds, token_metadata_program_id);

// Create a UMI connection
const umi = createUmi('https://api.devnet.solana.com');
const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const signer = createSignerFromKeypair(umi, keypair);
umi.use(signerIdentity(createSignerFromKeypair(umi, keypair)));

(async () => {
    try {
        // Start here
    let tx = await createMetadataAccountV3(umi, {
    metadata: publicKey(metadata_pda.toString()),
    mint: publicKey(mint.toString()),
    mintAuthority: signer,
    payer: signer,
        updateAuthority: keypair.publicKey,
        data: {
        name: "MATHIC",
        symbol: "MTC",
        uri: "www.mathic.com",
        sellerFeeBasisPoints: 0,
        creators: null,
        collection: null,
        uses: null
        },
        isMutable: true,
        collectionDetails: null
    })

        let result = await tx.sendAndConfirm(umi);
        console.log(result);
    } catch(e) {
        console.error(`Oops, something went wrong: ${e}`)
    }
})();