import { wallet,connection } from "./helper"
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { createGenericFile, createSignerFromKeypair, signerIdentity } from "@metaplex-foundation/umi"
import { createBundlrUploader } from "@metaplex-foundation/umi-uploader-bundlr"

const umi = createUmi(connection);
const bundlrUploader = createBundlrUploader(umi);

let keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet.payer.secretKey));
const signer = createSignerFromKeypair(umi, keypair);

umi.use(signerIdentity(signer));

export const nft_metadata = async (bonkAmt: any, wifAmt: any) => {
    console.log("Metadata IN:");
    try {
        // Follow this JSON structure
        // https://docs.metaplex.com/programs/token-metadata/changelog/v1.0#json-structure

        const image = "https://arweave.net/6Ukpr4bt6JfjVi-HkQCgg0D-rnviZeFE15qnIwLUpRc"
        const metadata = {
            name: "NOVI",
            symbol: "NOVI",
            description: "NOVI is an NFT",
            image: image,
            attributes: [
                { trait_type: 'BONK Amount', value: bonkAmt },
                {trait_type: 'WIF Amount', value: wifAmt},
            ],
            properties: {
                files: [
                    {
                        type: "image/png",
                        uri: image
                    },
                ]
            },
            creators: []
        };
        const myUri = await bundlrUploader.upload([createGenericFile(JSON.stringify(metadata), "metadata.json")]);
        console.log("Your image URI: ", myUri);
    }
    catch(error) {
        console.log("Oops.. Something went wrong", error);
    }
};