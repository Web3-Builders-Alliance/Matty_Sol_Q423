import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { createSignerFromKeypair, signerIdentity, generateSigner, percentAmount, TransactionBuilder } from "@metaplex-foundation/umi"
import { TokenStandard, createNft, createV1, mintV1, mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { readFile } from 'fs/promises'
import { wallet,connection } from "./helper"
import path from "path"
import base58 from "bs58";
import { close, fetchInscription, findAssociatedInscriptionPda, findInscriptionMetadataPda, findMintInscriptionPda, initializeFromMint, mplInscription, safeFetchInscriptionMetadataFromSeeds, safeFetchMintInscriptionFromSeeds, writeData } from "@metaplex-foundation/mpl-inscription";

        const umi = createUmi(connection);
        let keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet.payer.secretKey));
        const myKeypairSigner = createSignerFromKeypair(umi, keypair);
        umi.use(signerIdentity(myKeypairSigner));
        umi.use(mplTokenMetadata())
        const mint = generateSigner(umi);
        umi.use(mplTokenMetadata())
        umi.use(mplInscription())

        let inscriptionAccount: any;
        let inscriptionMetadataAccount: any;

        export const mintInscription = async (bonkAmt: any, wifAmt: any) => {

          console.log("Minting inscriptions..");
          //Create and mint the NFT to be inscribed.
          inscriptionAccount = findMintInscriptionPda(umi, {
            mint: mint.publicKey,
          })[0];

          console.log("\nInscription Account: ", inscriptionAccount);

          const nft_metadata_tx = await createV1(umi, {
            mint,
            name: 'NOVI',
            uri: `https://igw.metaplex.com/mainnet/${inscriptionAccount}`,
            sellerFeeBasisPoints: percentAmount(0),
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

          //This is where we write the bonk and wif amounts to the NFT metadata
          builder = builder.add(
            writeData(umi, {
              inscriptionAccount,
              inscriptionMetadataAccount,
              value: Buffer.from(
                `{"BONK": ${bonkAmt}, "WIF": ${wifAmt}}`
              ),
              associatedTag: null,
              offset: 0,
            })
          )

          const inscription_tx = await builder.sendAndConfirm(umi, { confirm: { commitment: 'processed' } })

          const signature2 = base58.encode(inscription_tx.signature);
          console.log(`\nSuccesfully inscribed! Check out your TX here:\nhttps://explorer.solana.com/tx/${signature2}?cluster=mainnet`)

          const mintInscription = await safeFetchMintInscriptionFromSeeds(umi, {
            mint: mint.publicKey,
          })
          console.log("Confirming inscribed JSON...",Buffer.from(mintInscription.data).toString())  

        }

        export const closeInscription = async () => {
          
          try {
            console.log("Closing inscription.. mint pub key",mint.publicKey)

            const mintInscription = await safeFetchMintInscriptionFromSeeds(umi, {
              mint: mint.publicKey,
            })
            
            console.log("mintInscription :", mintInscription)
            console.log("inscriptionAccount :", inscriptionAccount)
            
            //console.log("Confirming inscribed JSON before closing...", Buffer.from(mintInscription.data).toString())
          
            inscriptionMetadataAccount = await safeFetchInscriptionMetadataFromSeeds(
              umi,
              {
                inscriptionAccount
              }
            )
            console.log("fetchedInscriptionMetadataAccount :", inscriptionMetadataAccount)

            const closeInscription = await close(umi, {
              inscriptionAccount: inscriptionAccount.publicKey,
              inscriptionMetadataAccount:inscriptionMetadataAccount.publicKey,
              associatedTag: null,
            }).sendAndConfirm(umi, { confirm: { commitment: 'processed' } })

            const signature = base58.encode(closeInscription.signature);
            console.log(`\nSuccesfully closed inscription! Check out your TX here:\nhttps://explorer.solana.com/tx/${signature}?cluster=mainnet`)

            await uploadImage();

          } catch (error) {
            console.log(error);
          }
        }

        const uploadImage = async () => {
          try {
            //Open the image file to fetch the raw bytes.
            const image = path.join(__dirname, 'images', 'Novi-min.png');
            const imageBuffer = await readFile(image);
            //const imageBytes: Buffer = await readFile('Novi.png')

            // And write the image.
            const chunkSize = 800
            console.log("Image Buffer: ", imageBuffer.length);
            let k = 0;
            for (let i = 0; i < imageBuffer.length; i += chunkSize) {
              console.log("Chunk: ", i);
              const chunk = imageBuffer.slice(i, i + chunkSize)
              const imageTx = await writeData(umi, {
                inscriptionAccount,
                inscriptionMetadataAccount,
                value: chunk,
                associatedTag: 'image',
                offset: i,
              }).sendAndConfirm(umi)

              if (k <= 10) {
                const signature3 = base58.encode(imageTx.signature);
                console.log(`Succesfully saved NFT Image on chain! Check out your TX here:\nhttps://explorer.solana.com/tx/${signature3}?cluster=devnet`)
                k++;
              }
            }
                  
            console.log("inscriptionMetadataAccount...", inscriptionMetadataAccount)

            const mintInscriptionAccount = await safeFetchMintInscriptionFromSeeds(umi, {
              mint: mint.publicKey,
            })

            console.log("mintInscription...", Buffer.from(mintInscriptionAccount.data).toString())
                  
            console.log("fetchedInscriptionMetadataAccount2...", inscriptionMetadataAccount)
                  
            const fetchedAssociatedInscriptionAccount = findAssociatedInscriptionPda(umi, {
              associated_tag: inscriptionAccount.associatedInscriptions[0].tag,
              inscriptionMetadataAccount: inscriptionMetadataAccount.publicKey,
            })

            console.log("fetchedAssociatedInscriptionAccount...", fetchedAssociatedInscriptionAccount)

            const imageData = await fetchInscription(umi, fetchedAssociatedInscriptionAccount[0])


            // Convert Buffer to a UTF-8 string
            const str = new TextDecoder().decode(imageData);

            console.log(str); // Output will be 'hello world'
          }
          catch (error) {
            console.log("Oops.. Something went wrong", error);
          }
        };