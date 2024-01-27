import {
  provider,
  wallet,
  connection,
  getAdressLookupTableAccounts,
  log,
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
import { createSignerFromKeypair, generateSigner, percentAmount, signerIdentity } from "@metaplex-foundation/umi";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { mplInscription } from "@metaplex-foundation/mpl-inscription";
import { closeInscription, mintInscription } from "./nft_mint";

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
    
    let BONK: PublicKey;
    let WIF: PublicKey;
    let SOL: PublicKey;
    
    //Change this to an address you control if you want.
    let vault: PublicKey;

    let bonkAta: any;
    let wifAta: any;
    let solAta: any;
    
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
        const txID = await provider.sendAndConfirm(transaction, [wallet.payer],{skipPreflight: true})
        log( txID );
      } catch (e) {
        closeAccount
        console.log({ simulationResponse: e });
      }
    };

    const init = async () => {
      
      console.log("Init accounts and test valuess");

      BONK = new PublicKey("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263");
      WIF = new PublicKey ("EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm")
      SOL = new PublicKey("So11111111111111111111111111111111111111112");
      
      //Change this to an address you control if you want.
      vault = new PublicKey("3pyyjpMeZt7LaV9mdVA14pNKbXiian77of7LiiFv9b6Q");

    };

    //Entry point
    const testDepositWithdraw = (async () => {
      console.log("Novi entry point ...");  
      const amount = 200000;

      await init();
      await deposit(allocateFund(amount));
      await withdraw(allocateFund(amount));
    })();  
    
    ////Swap SOL to BONK and WIF and deposit to vault
    const deposit = async (depositAmt: number) => {
      console.log("Initiating swap SOL to BONK and WIF and deposit to vault");

      try {
        //create associated token accounts for bonk and wif
        bonkAta = (await getOrCreateAssociatedTokenAccount(connection, wallet.payer, BONK, vault)).address
        wifAta = (await getOrCreateAssociatedTokenAccount(connection, wallet.payer, WIF, vault)).address
      } catch (error) {
      console.log(error);
      }

      // Find the best Quote from the Jupiter API
    
      const quoteBonk = await getQuote(SOL, BONK, depositAmt);
      const bonkIx = await getSwapIx(wallet.publicKey, bonkAta, quoteBonk);

      if ("error" in bonkIx) {
        console.log({ bonkIx });
        return bonkIx;
      }

      await swap(bonkIx);

      const quoteWIF = await getQuote(SOL, WIF, depositAmt);
      const wifIX = await getSwapIx(wallet.publicKey, wifAta, quoteWIF);

      if ("error" in wifIX) {
        console.log({ wifIX });
        return wifIX;
      }
      await swap(wifIX);
      //mint NFT and inscribe in order to attach their swap amount(bonk and wif) with their NFT.
      await mintInscription(depositAmt, depositAmt);

    }

    //Swap BONK and WIF to SOL and send SOL to user account
    const withdraw = (async (withdrawAmt: number) => {
      console.log("Swap BONK and WIF to SOL and withdraw to user account");

      //SOL ata of user/payer to recieve SOL back.
      solAta = (await getOrCreateAssociatedTokenAccount(connection, wallet.payer, SOL, wallet.publicKey)).address
        
       // Find the best Quote from the Jupiter API
      const quoteBonk = await getQuote(BONK, SOL, withdrawAmt);
      const bonkIx = await getSwapIx(wallet.publicKey, solAta, quoteBonk);

      if ("error" in bonkIx) {
        console.log({ bonkIx });
        return bonkIx;
      }

      await swap(bonkIx);

      //TODO withdrawal issue with WIF
      const quoteWIF = await getQuote(WIF, SOL, withdrawAmt);
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

    //For now distribute funds equally between WIF and BONK.
    const allocateFund = (depositAmt: number): number => {
      return depositAmt / 2;
    
    }

//TODO use this for introspection of the swap instruction
    
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

      