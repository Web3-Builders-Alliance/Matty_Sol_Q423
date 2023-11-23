import wallet from "../wba-wallet.json"
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { createGenericFile, createSignerFromKeypair, signerIdentity } from "@metaplex-foundation/umi"
import { createBundlrUploader } from "@metaplex-foundation/umi-uploader-bundlr"
import { readFile } from 'fs/promises'
import path from "path"

// Create a devnet connection
const umi = createUmi('https://api.devnet.solana.com');
const bundlrUploader = createBundlrUploader(umi);

let keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const signer = createSignerFromKeypair(umi, keypair);

umi.use(signerIdentity(signer));

(async () => {
    try {
        const image = path.join(__dirname, 'images', 'rug.png');
        const imageBuffer = await readFile(image);
        const myUri = createGenericFile(imageBuffer, "Rugly");
        const uploader= await bundlrUploader.upload([myUri]); // Fix: Pass the file URI as an array argument

        console.log("Your image URI: ", uploader);
    }
    catch(error) {
        console.log("Oops.. Something went wrong", error);
    }
})();