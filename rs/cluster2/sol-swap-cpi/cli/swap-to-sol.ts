import {
  provider,
  wallet,
  connection,
  getAdressLookupTableAccounts,
} from "./helper";
import { closeAccount, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import {
  TransactionMessage,
  PublicKey,
  VersionedTransaction,
  TransactionInstruction,
  AddressLookupTableAccount
} from "@solana/web3.js";
import fetch from "node-fetch";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { TransactionBuilder, createSignerFromKeypair, generateSigner, percentAmount, signerIdentity } from "@metaplex-foundation/umi";
import { TokenStandard, createV1, mintV1, mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { close, findInscriptionMetadataPda, findMintInscriptionPda, initializeFromMint, mplInscription, safeFetchInscriptionMetadataFromSeeds, safeFetchMintInscriptionFromSeeds, writeData } from "@metaplex-foundation/mpl-inscription";
import base58 from "bs58";

    const JUP_API_ENDPOINT = "https://quote-api.jup.ag/v6";

    //Used by Jupiter to find all the accounts that could needed for the swap transaciton
    const addressLookupTableAccounts: AddressLookupTableAccount[] = [];

    const umi = createUmi(connection);
    let keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet.payer.secretKey));

    console.log("Wallet keypair: ", keypair.publicKey);
    const myKeypairSigner = createSignerFromKeypair(umi, keypair);
    umi.use(signerIdentity(myKeypairSigner));
    umi.use(mplTokenMetadata())
    umi.use(mplInscription())

    const mint = generateSigner(umi);
    console.log("\nMint Address: ", mint.publicKey);
    
    //const USDC = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
    let BONK: PublicKey;
    let WIF: PublicKey;
    let SOL: PublicKey;
    
    //Change this to an address you control if you want.
    let vault: PublicKey;

    let bonkAmt: number;
    let wifAmt: number;
    let solAmt: number;

    let bonkAta: any;
    let wifAta: any;
    let solAta: any;
    
    let inscriptionAccount: any;

    //get quote of the swap from Jupiter
    const getQuote = async (
      fromMint: PublicKey,
      toMint: PublicKey,
      amount: number
    ) => {
      console.log("Fetching quote from Jupiter..");
      return fetch(
        `${JUP_API_ENDPOINT}/quote?outputMint=${toMint.toBase58()}&inputMint=${fromMint.toBase58()}&amount=${amount}&slippage=0.5&onlyDirectRoutes=true`
      ).then((response: any) => response.json());
    };

    //get swap instruction from Jupiter
    const getSwapIx = async (
      user: PublicKey,
      outputAccount: PublicKey,
      quote: any
    ) => {

      console.log("Fetching swap instructions from Jupiter..");
      const data = {
        quoteResponse: quote,
        userPublicKey: user.toBase58(),
        destinationTokenAccount: outputAccount.toBase58(),
      };
      return fetch(`${JUP_API_ENDPOINT}/swap-instructions`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }).then((response:any) => response.json());
    };

    const swapFromSol = async (
      swapPayload: any,
      setupInstructions: any[],
    ) => {

      const blockhash = (await connection.getLatestBlockhash()).blockhash;
      const messageV0 = new TransactionMessage({
        payerKey: wallet.publicKey,
        recentBlockhash: blockhash,
        instructions: [
          ...setupInstructions.map(deserializeInstruction),
          deserializeInstruction(swapPayload),
          //instructions,      
        ]
      }).compileToV0Message(addressLookupTableAccounts);
      
      const transaction = new VersionedTransaction(messageV0);
      try {
        const txID = await provider.sendAndConfirm(transaction, [wallet.payer],{skipPreflight: true}).then(log);
        //console.log({ txID });
      } catch (e) {
        closeAccount
        console.log({ simulationResponse: e });
      }
    };

    const init = async () => {
      
      console.log("Init..");

      BONK = new PublicKey("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263");
      WIF = new PublicKey ("EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm")
      SOL = new PublicKey("So11111111111111111111111111111111111111112");
      
      //Change this to an address you control if you want.
      vault = new PublicKey("3pyyjpMeZt7LaV9mdVA14pNKbXiian77of7LiiFv9b6Q");

      bonkAmt = 100000;
      wifAmt = 200000;
      solAmt = 1000;

    };

    const testDepositWithdraw = (async () => {
      console.log("Initiating testDepositWithdraw");  
      await init();
      await deposit();
      await withdraw();
    })();  
    
    ////Swap SOL to BONK and WIF and deposit to vault
    const deposit = async () => {
      console.log("Initiating swap SOL to BONK and WIF and deposit to vault");

      try {
        //create associated token accounts for bonk and wif
        bonkAta = (await getOrCreateAssociatedTokenAccount(connection, wallet.payer, BONK, vault)).address
        wifAta = (await getOrCreateAssociatedTokenAccount(connection, wallet.payer, WIF, vault)).address
        //solAta = (await getOrCreateAssociatedTokenAccount(connection, wallet.payer, SOL, vault)).address
      
      } catch (error) {
      console.log(error);
      }

      // Find the best Quote from the Jupiter API
      const quoteBonk = await getQuote(SOL, BONK, bonkAmt);
      const bonkIx = await getSwapIx(wallet.publicKey, bonkAta, quoteBonk);

      if ("error" in bonkIx) {
        console.log({ bonkIx });
        return bonkIx;
      }

      await swap(bonkIx);

      const quoteWIF = await getQuote(SOL, WIF, wifAmt);
      const wifIX = await getSwapIx(wallet.publicKey, wifAta, quoteWIF);

      if ("error" in wifIX) {
        console.log({ wifIX });
        return wifIX;
      }
      await swap(wifIX);
      //mint NFT and inscribe in order to attach their swap amount(bonk and wif) with their NFT.
      await mintInscription(bonkAmt, wifAmt);

    }

    //Swap BONK and WIF to SOL
    const withdraw = (async () => {
      console.log("Swap BONK and WIF to SOL and withdraw to user account");

      //SOL ata of user/payer
      solAta = (await getOrCreateAssociatedTokenAccount(connection, wallet.payer, SOL, wallet.publicKey)).address
        
       // Find the best Quote from the Jupiter API
      const quoteBonk = await getQuote(BONK, SOL, bonkAmt);
      const bonkIx = await getSwapIx(wallet.publicKey, solAta, quoteBonk);

      if ("error" in bonkIx) {
        console.log({ bonkIx });
        return bonkIx;
      }

      await swap(bonkIx);

      const quoteWIF = await getQuote(WIF, SOL, solAmt);
      const wifIX = await getSwapIx(wallet.publicKey, solAta, quoteWIF);

      if ("error" in wifIX) {
        console.log({ wifIX });
        return wifIX;
      }
      await swap(wifIX);

      //close the inscription account after wihdrawing bonk and wif
      await closeInscription();

    });

    const swap = async (quote: any) => {

      try {
        const {
            setupInstructions, // Setup missing ATA for the users.
            swapInstruction: swapInstructionPayload, // The actual swap instruction.
            addressLookupTableAddresses, // The lookup table addresses that you can use if you are using versioned transaction.
        } = quote;
        
        //clear the lookup table
        addressLookupTableAccounts.map(arr => []);
        // Add the lookup table accounts to the array.
        addressLookupTableAccounts.push(
          ...(await getAdressLookupTableAccounts(addressLookupTableAddresses))
        );
      
        await swapFromSol(
          swapInstructionPayload,
          setupInstructions
        );
        
      } catch (error) {
        console.log(error);
      }

    }
    const deserializeInstruction = (instruction: any) => {
      return new TransactionInstruction({
        programId: new PublicKey(instruction.programId),
        keys: instruction.accounts.map((key: any) => ({
          pubkey: new PublicKey(key.pubkey),
          isSigner: key.isSigner,
          isWritable: key.isWritable,
        })),
        data: Buffer.from(instruction.data, "base64"),
      });
    };

    const mintInscription = async (bonkAmt: any, wifAmt: any) => {

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

    const closeInscription = async () => {
      
      try {
        console.log("Closing inscription.. mint pub key",mint.publicKey)

        const mintInscription = await safeFetchMintInscriptionFromSeeds(umi, {
          mint: mint.publicKey,
        })
        
        console.log("mintInscription :", mintInscription)
        console.log("inscriptionAccount :", inscriptionAccount)
        
        //console.log("Confirming inscribed JSON before closing...", Buffer.from(mintInscription.data).toString())
      
        const fetchedInscriptionMetadataAccount = await safeFetchInscriptionMetadataFromSeeds(
          umi,
          {
            inscriptionAccount
          }
        )
        console.log("fetchedInscriptionMetadataAccount :", fetchedInscriptionMetadataAccount)

        const closeInscription = await close(umi, {
          inscriptionAccount: inscriptionAccount.publicKey,
          inscriptionMetadataAccount:fetchedInscriptionMetadataAccount.publicKey,
          associatedTag: null,
        }).sendAndConfirm(umi, { confirm: { commitment: 'processed' } })

        const signature = base58.encode(closeInscription.signature);
        console.log(`\nSuccesfully closed inscription! Check out your TX here:\nhttps://explorer.solana.com/tx/${signature}?cluster=mainnet`)

      } catch (error) {
        console.log(error);
      }
    }

    const confirm = async (signature: string): Promise<string>  => {
      const block = await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        signature,
        ...block
      });

      return signature;
    }
      
    const log = async (signature: string): Promise<string>  => {
      console.log(`Your tx signature: https://explorer.solana.com/transaction/${signature}?cluster=mainnet`);

      return signature;
    }

    //let swapInstruction = instructionDataToTransactionInstruction(swapPayload);

    // const instructions = 
    //   //...computeBudgetPayloads.map(instructionDataToTransactionInstruction);
    //   await program.methods
    //     .swapToSol(swapInstruction.data)
    //     .accounts({
    //       programAuthority: programAuthority,
    //       programWsolAccount: programWSOLAccount,
    //       userAccount: wallet.publicKey,
    //       solMint: NATIVE_MINT,
    //       //inscriptionAccount,
    //       //inscriptionMetadataAccount,
    //       jupiterProgram: jupiterProgramId,
    //       tokenProgram: TOKEN_PROGRAM_ID,
    //       systemProgram: SystemProgram.programId,
    //       mplInscriptionProgram: MPL_INSCRIPTION_PROGRAM_ID
    //     })
    //     .remainingAccounts(swapInstruction.keys)
    //     .instruction()
    //   ;

      