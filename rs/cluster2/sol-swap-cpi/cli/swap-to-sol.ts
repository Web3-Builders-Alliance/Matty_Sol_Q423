import {
  programAuthority,
  programWSOLAccount,
  provider,
  wallet,
  program,
  jupiterProgramId,
  connection,
  getAdressLookupTableAccounts,
  instructionDataToTransactionInstruction,
} from "./helper";
import { TOKEN_PROGRAM_ID, NATIVE_MINT, closeAccount, ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import {
  SystemProgram,
  TransactionMessage,
  PublicKey,
  VersionedTransaction,
  TransactionInstruction,
  AddressLookupTableAccount,
  Transaction,
} from "@solana/web3.js";
import fetch from "node-fetch";

const API_ENDPOINT = "https://quote-api.jup.ag/v6";

const addressLookupTableAccounts: AddressLookupTableAccount[] = [];

const getQuote = async (
  fromMint: PublicKey,
  toMint: PublicKey,
  amount: number
) => {
  return fetch(
    `${API_ENDPOINT}/quote?outputMint=${toMint.toBase58()}&inputMint=${fromMint.toBase58()}&amount=${amount}&slippage=0.5&onlyDirectRoutes=true`
  ).then((response: any) => response.json());
};

const getSwapIx = async (
  user: PublicKey,
  outputAccount: PublicKey,
  quote: any
) => {
  const data = {
    quoteResponse: quote,
    userPublicKey: user.toBase58(),
    destinationTokenAccount: outputAccount.toBase58(),
  };
  return fetch(`${API_ENDPOINT}/swap-instructions`, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  }).then((response:any) => response.json());
};

const swapToSol = async (
  computeBudgetPayloads: any[],
  swapPayload: any,
  addressLookupTableAddresses: string[],
  setupInstructions: any[],
  cleanupInstruction: any
) => {
  let swapInstruction = instructionDataToTransactionInstruction(swapPayload);

  // const instructions = 
  //   //...computeBudgetPayloads.map(instructionDataToTransactionInstruction);
  //   await program.methods
  //     .swapToSol(swapInstruction.data)
  //     .accounts({
  //       programAuthority: programAuthority,
  //       programWsolAccount: programWSOLAccount,
  //       userAccount: wallet.publicKey,
  //       solMint: NATIVE_MINT,
  //       jupiterProgram: jupiterProgramId,
  //       tokenProgram: TOKEN_PROGRAM_ID,
  //       systemProgram: SystemProgram.programId,
  //     })
  //     .remainingAccounts(swapInstruction.keys)
  //     .instruction()
  //   ;

  const blockhash = (await connection.getLatestBlockhash()).blockhash;
  
  // If you want, you can add more lookup table accounts here
  // const addressLookupTableAccounts = await getAdressLookupTableAccounts(
  //   addressLookupTableAddresses
  // );

  const messageV0_2 = new TransactionMessage({
    payerKey: wallet.publicKey,
    recentBlockhash: blockhash,
    instructions: [
      ...setupInstructions.map(deserializeInstruction),
      deserializeInstruction(swapPayload),
      //instructions,
    //deserializeInstruction(cleanupInstruction),
  
    ]

  }).compileToV0Message(addressLookupTableAccounts);
  
  const transaction2 = new VersionedTransaction(messageV0_2);
  try {
    //const simulate = await provider.simulate(transaction2, [wallet.payer]);
    //console.log({ simulate });

    const txID = await provider.sendAndConfirm(transaction2, [wallet.payer],{skipPreflight: true});
    console.log({ txID });
  } catch (e) {
    closeAccount
    console.log({ simulationResponse: e });
  }
};

//Main
const swap_to_bonk_and_sol = async (bonkAmt:number, wifAmt: any) => {
  const USDC = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
  const BONK = new PublicKey("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263");
  const WIF = new PublicKey ("EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm")
  const SOL = new PublicKey("So11111111111111111111111111111111111111112");
  const myAccount = new PublicKey("3pyyjpMeZt7LaV9mdVA14pNKbXiian77of7LiiFv9b6Q");

  let bonkAta: any;
  let wifAta: any;
  try {
    bonkAta = (await getOrCreateAssociatedTokenAccount(connection, wallet.payer, BONK, myAccount)).address
    wifAta = (await getOrCreateAssociatedTokenAccount(connection, wallet.payer, WIF, myAccount)).address
  
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

  swap(bonkIx);

  const quoteWIF = await getQuote(SOL, WIF, wifAmt);
  const wifIX = await getSwapIx(wallet.publicKey, wifAta, quoteWIF);

  if ("error" in wifIX) {
    console.log({ wifIX });
    return wifIX;
  }

  swap(wifIX);

};

const swap = async (quote: any) => {

  try {

    const {
      //    tokenLedgerInstruction, // If you are using `useTokenLedger = true`.
        computeBudgetInstructions, // The necessary instructions to setup the compute budget.
        setupInstructions, // Setup missing ATA for the users.
        swapInstruction: swapInstructionPayload, // The actual swap instruction.
        cleanupInstruction, // Unwrap the SOL if `wrapAndUnwrapSol = true`.
        addressLookupTableAddresses, // The lookup table addresses that you can use if you are using versioned transaction.
    } = quote;
    
    //clear the lookup table
    addressLookupTableAccounts.map(arr => []);
    // Add the lookup table accounts to the array.
    addressLookupTableAccounts.push(
      ...(await getAdressLookupTableAccounts(addressLookupTableAddresses))
    );
  
    await swapToSol(
      computeBudgetInstructions,
      swapInstructionPayload,
      addressLookupTableAddresses,
      setupInstructions,
      cleanupInstruction
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

const confirm = async (signature: string): Promise<string>  => {
  const block = await connection.getLatestBlockhash();
  await connection.confirmTransaction({
    signature,
    ...block
  });

  return signature;
}
  
const log = async (signature: string): Promise<string>  => {
  console.log(`Your tx signature: https://explorer.solana.com/transaction/${signature}?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899`);

  return signature;
}

const mintNFT = async (tokenAccount: PublicKey, mint: PublicKey, destination: PublicKey, amount: number) => {

}