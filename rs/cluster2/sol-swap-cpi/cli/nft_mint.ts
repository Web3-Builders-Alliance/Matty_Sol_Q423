import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { createSignerFromKeypair, signerIdentity, generateSigner, percentAmount, TransactionBuilder } from "@metaplex-foundation/umi"
import { TokenStandard, createNft, createV1, mintV1, mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { readFile } from 'fs/promises'
import { wallet,connection } from "./helper"
import path from "path"
import base58 from "bs58";
import { fetchInscription, findAssociatedInscriptionPda, findInscriptionMetadataPda, findMintInscriptionPda, initialize, initializeAssociatedInscription, initializeFromMint, mplInscription, safeFetchInscriptionMetadataFromSeeds, safeFetchMintInscriptionFromSeeds, writeData } from "@metaplex-foundation/mpl-inscription";

    //TODO Version 2. 
    //TODO Minting tokens could be expense.. cNFT is less composable .. Can't fetch metadata from cNFTs..
    //TODO ETF .. Marinade SOL... For selling their share without redemption.. also liquid staking..
    //TODO Hard to spin up protocols on top of NFTs...
    // And then write the JSON data for the NFT to the Inscription account.

    //TODO smart contract side is better... use introspection to verify amounts..for Security 

const umi = createUmi(connection);

let keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet.payer.secretKey));
//console.log("Wallet keypair: ", keypair.publicKey);
const myKeypairSigner = createSignerFromKeypair(umi, keypair);
//console.log("Wallet myKeypairSigner: ", myKeypairSigner.publicKey);
umi.use(signerIdentity(myKeypairSigner));
umi.use(mplTokenMetadata())

const mint = generateSigner(umi);
//console.log("\nMint Address: ", mint.publicKey);

umi.use(mplTokenMetadata())
umi.use(mplInscription())

export const nft_mint = (async () => {

  try {
    // Create and mint the NFT to be inscribed.
    const inscriptionAccount = findMintInscriptionPda(umi, {
      mint: mint.publicKey,
    })[0];

    console.log("\nInscription Account: ", inscriptionAccount);

    const nft_metadata_tx = await createV1(umi, {
      mint,
      name: 'NOVI',
      uri: `https://igw.metaplex.com/mainnet/${inscriptionAccount}`,
      sellerFeeBasisPoints: percentAmount(5.5),
      tokenStandard: TokenStandard.NonFungible,
    }).sendAndConfirm(umi)

    console.log("\nMy NFT Metadata: ", nft_metadata_tx.result);
   
    const signature = base58.encode(nft_metadata_tx.signature);
    console.log(` \nCheck out your TX here:\nhttps://explorer.solana.com/tx/${signature}?cluster=mainnet`)

    const nft_mint = await mintV1(umi, {
      mint: mint.publicKey,
      tokenStandard: TokenStandard.NonFungible,
    }).sendAndConfirm(umi)

    console.log("\nSuccesfully Minted! ", nft_mint.result);

    const signature3 = base58.encode(nft_mint.signature);
    console.log(` \n Minted : Check out your TX here:\nhttps://explorer.solana.com/tx/${signature3}?cluster=mainnet`)

    const inscriptionMetadataAccount = findInscriptionMetadataPda(umi, {
      inscriptionAccount,
    })[0];

    console.log("\nInscription Metadata Account: ", inscriptionMetadataAccount);

    let builder = new TransactionBuilder()

    // We initialize the Inscription and create the account where the JSON will be stored.
    builder = builder.add(
      initializeFromMint(umi, {
        mintAccount: mint.publicKey,
      })
    )
      
    builder = builder.add(
      writeData(umi, {
        inscriptionAccount,
        inscriptionMetadataAccount,
        value: Buffer.from(
          '{"BONK": "10000", "WIF": "20000"}'
        ),
        associatedTag: null,
        offset: 0,
      })
    )

    const inscription_tx = await builder.sendAndConfirm(umi, { confirm: { commitment: 'processed' } })

    const signature2 = base58.encode(inscription_tx.signature);
    console.log(`\nSuccesfully inscribed! Check out your TX here:\nhttps://explorer.solana.com/tx/${signature2}?cluster=mainnet`)

    // We then create the associated Inscription that will contain the image.
    // const associatedInscriptionAccount = findAssociatedInscriptionPda(umi, {
    //   associated_tag: 'image',
    //   inscriptionMetadataAccount,
    // })

    // builder = builder.add(
    //   initializeAssociatedInscription(umi, {
    //     inscriptionMetadataAccount,
    //     associatedInscriptionAccount,
    //     associationTag: 'image',
    //     inscriptionAccount: inscriptionAccount[0],
    //   })
    // )



    // Open the image file to fetch the raw bytes.
    // const image = path.join(__dirname, 'images', 'Novi-min.png');
    // const imageBuffer = await readFile(image);
    // //const imageBytes: Buffer = await readFile('Novi.png')

    // // And write the image.
    // const chunkSize = 800
    // console.log("Image Buffer: ", imageBuffer.length);
    // let k = 0;
    // for (let i = 0; i < imageBuffer.length; i += chunkSize) {
    //   console.log("Chunk: ", i);
    //   const chunk = imageBuffer.slice(i, i + chunkSize)
    //   const imageTx = await writeData(umi, {
    //     inscriptionAccount: associatedInscriptionAccount,
    //     inscriptionMetadataAccount,
    //     value: chunk,
    //     associatedTag: 'image',
    //     offset: i,
    //   }).sendAndConfirm(umi)

    //   if(k <= 10) {
    //     const signature3 = base58.encode(imageTx.signature);
    //     console.log(`Succesfully wrote IMAGE! Check out your TX here:\nhttps://explorer.solana.com/tx/${signature3}?cluster=devnet`)
    //     k++;
    //   }
    // }

    /////////////////////////////FETCH INSCRIPTIONS/////////////////////////////
    const fetchedInscriptionMetadataAccount = await safeFetchInscriptionMetadataFromSeeds(
      umi,
      {
        inscriptionAccount
      }
    )
    
    console.log("fetchedInscriptionMetadataAccount...",fetchedInscriptionMetadataAccount)

    const mintInscription = await safeFetchMintInscriptionFromSeeds(umi, {
      mint: mint.publicKey,
    })

    console.log("mintInscription...",Buffer.from(mintInscription.data).toString())
    
    // const fetchedInscriptionMetadataAccount2 = await safeFetchInscriptionMetadataFromSeeds(
    //   umi,
    //   {
    //     inscriptionAccount
    //   }
    // )

    // console.log("fetchedInscriptionMetadataAccount2...",fetchedInscriptionMetadataAccount2)
    
  //   const fetchedAssociatedInscriptionAccount = findAssociatedInscriptionPda(umi, {
  //     associated_tag: fetchedInscriptionMetadataAccount2.associatedInscriptions[0].tag,
  //     inscriptionMetadataAccount: fetchedInscriptionMetadataAccount2.publicKey,
  //   })

  //  console.log("fetchedAssociatedInscriptionAccount...",fetchedAssociatedInscriptionAccount)

  //  const imageData = await fetchInscription(umi, fetchedAssociatedInscriptionAccount[0])


  //  // Convert Buffer to a UTF-8 string
  //  const str = new TextDecoder().decode(imageData);

  //  console.log(str); // Output will be 'hello world'
  }
  catch (error) {
    console.log("Oops.. Something went wrong", error);
  }
});

export const create_mint = (async () => {

});

// export const nft_inscription = (async () => {
//   console.log("Inscription in:");

//   try {
//     const umi = createUmi(connection);

//     let keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet.payer.secretKey));
//     console.log("Wallet keypair: ", keypair.publicKey);
//     const myKeypairSigner = createSignerFromKeypair(umi, keypair);
//     console.log("Wallet myKeypairSigner: ", myKeypairSigner.publicKey);
//     umi.use(signerIdentity(myKeypairSigner));
//     umi.use(mplTokenMetadata())

//     const mint = generateSigner(umi);
//   }
//     catch (error) {
//     }
//   });