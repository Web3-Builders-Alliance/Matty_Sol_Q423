import { wallet, connection } from "./helper"
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { createGenericFile, createSignerFromKeypair, signerIdentity } from "@metaplex-foundation/umi"
import { createBundlrUploader } from "@metaplex-foundation/umi-uploader-bundlr"
import { readFile } from 'fs/promises'
import path from "path"

//console.log("Image:");

const umi = createUmi(connection);
//const umi2 = createUmi('https://api.mainnet-beta.solana.com');
const bundlrUploader = createBundlrUploader(umi);

let keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet.payer.secretKey));
const signer = createSignerFromKeypair(umi, keypair);

umi.use(signerIdentity(signer));

export const nft_image = (async () => {
    console.log("Image in ");
    try {
        const image = path.join(__dirname, 'images', 'Novi.png');
        const imageBuffer = await readFile(image);
        const myUri = createGenericFile(imageBuffer, "Novi");
        const uploader= await bundlrUploader.upload([myUri]); // Fix: Pass the file URI as an array argument

        console.log("Your Novi image URI: ", uploader);
    }
    catch(error) {
        console.log("Oops.. Something went wrong", error);
    }
});