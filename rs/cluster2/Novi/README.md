# SOL Swap with Jupiter CPI

The first Novi MVP program allows you to deposit SOL and the program manages your funds by spliting your fund equally between WIF and BONK on Jupiter with 0.5% Slippage amount. Right now we use direct route to avoid accounts excedding the total accounts allowed by SVM (via CPI call). 

Once we purchase WIF and BONK, the fund is deposited in our vault. And the user recieves an NFT with attached inscription where we store the value of BONK and WIF as an attribute.

As of now there is no UI but rather a script to run. The intiall part of the program is deployed on mainnet with program Id. **5XgQemzvKnPyfgpdisFzexL7VEvWcj4Tng5rq84YrsgY**

The interaction with Jupiter happens via typescript on mainnet.

The program uses *NodeWallet* so make sure to have a keypair on your local machine(.config/solana/id.json) that has funds on mainnet.

The swap doesn't consume more than a penny but the inscription may cost up to 0.01-0.02 SOL(~$2.2 per tx at the time of writing this). You can comment out the following inscrption sections in *swap-to-sol.ts* or run them separately on devnet without the Jupiter transactions:

- mintInscription
- closeInscription 

Once you are in the NOVI directory run

npm i
yarn install
anchor build
anchor test 

Sometimes you might get TransactionExpiredTimeoutError but try to copy the signature of that transaction and check it on solana explorer. Usually its successful. 

Future iterations:

We will leverage Jupiters Flash Fill in addition to LookupAccountsTable on next iteration to mitigate this problem.

A UI for users to interact with their solana wallet and also view their funds amount in a website.