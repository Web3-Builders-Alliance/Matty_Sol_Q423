import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { IDL } from "../target/types/swap_to_sol";
import {
  PublicKey,
  Connection,
  AddressLookupTableAccount,
  TransactionInstruction,
  Commitment,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";

export const programId = new PublicKey(
  "5XgQemzvKnPyfgpdisFzexL7VEvWcj4Tng5rq84YrsgY"
);
export const jupiterProgramId = new PublicKey(
  "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"
);


      const options = anchor.AnchorProvider.defaultOptions();
      export const wallet = NodeWallet.local();

      export const connection = new Connection("https://api.mainnet-beta.solana.com","processed" as Commitment);
      export const provider = new anchor.AnchorProvider(connection, wallet, options);


      anchor.setProvider(provider);
      export const program = new Program(IDL as anchor.Idl, programId, provider);

      const findProgramAuthority = (): PublicKey => {
        return PublicKey.findProgramAddressSync(
          [Buffer.from("authority")],
          programId
        )[0];
      };
      export const programAuthority = findProgramAuthority();

      const findProgramWSOLAccount = (): PublicKey => {
        return PublicKey.findProgramAddressSync([Buffer.from("wsol")], programId)[0];
      };
      export const programWSOLAccount = findProgramWSOLAccount();

      export const findAssociatedTokenAddress = ({
        walletAddress,
        tokenMintAddress,
      }: {
        walletAddress: PublicKey;
        tokenMintAddress: PublicKey;
      }): PublicKey => {
        return PublicKey.findProgramAddressSync(
          [
            walletAddress.toBuffer(),
            TOKEN_PROGRAM_ID.toBuffer(),
            tokenMintAddress.toBuffer(),
          ],
          ASSOCIATED_TOKEN_PROGRAM_ID
        )[0];
      };

      export const getAdressLookupTableAccounts = async (
        keys: string[]
      ): Promise<AddressLookupTableAccount[]> => {
        const addressLookupTableAccountInfos =
          await connection.getMultipleAccountsInfo(
            keys.map((key) => new PublicKey(key))
          );

        return addressLookupTableAccountInfos.reduce((acc, accountInfo, index) => {
          const addressLookupTableAddress = keys[index];
          if (accountInfo) {
            const addressLookupTableAccount = new AddressLookupTableAccount({
              key: new PublicKey(addressLookupTableAddress),
              state: AddressLookupTableAccount.deserialize(accountInfo.data),
            });
            acc.push(addressLookupTableAccount);
          }

          return acc;
        }, new Array<AddressLookupTableAccount>());
      };

      export const instructionDataToTransactionInstruction = (
        instructionPayload: any
      ) => {
        if (instructionPayload === null) {
          console.log("instructionPayload is null");
          return null;
        }

        return new TransactionInstruction({
          programId: new PublicKey(instructionPayload.programId),
          keys: instructionPayload.accounts.map((key: any) => ({
            pubkey: new PublicKey(key.pubkey),
            isSigner: key.isSigner,
            isWritable: key.isWritable,
          })),
          data: Buffer.from(instructionPayload.data, "base64"),
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
        
      export const log = async (signature: string): Promise<string>  => {
        console.log(`Your tx signature: https://explorer.solana.com/transaction/${signature}?cluster=mainnet`);
  
        return signature;
      }
