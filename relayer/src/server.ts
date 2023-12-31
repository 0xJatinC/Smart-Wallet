import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import cron from 'node-cron';
import cors from 'cors';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { SigningCosmosClient } from '@cosmjs/launchpad';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';

const app = express();
const PORT = 3000;

// Middleware to parse JSON body
app.use(bodyParser.json());

// Enable CORS for all routes
app.use(cors());


// Our queue to store UserOp objects
const userOpQueue: any[] = [];
const entrypointContract: string = 'nibi1436kxs0w2es6xlqpp9rd35e3d0cjnw4sv8j3a7483sgks29jqwgsn6ytm8';

const endpoint = "chain endpoint";
const mnemonic = "";


// POST endpoint to add a UserOp to the queue
app.post('/enqueue', (req: Request, res: Response) => {
    const userOp: any = req.body;

    if (!userOp) {
        return res.status(400).json({ error: 'UserOp object is required' });
    }

    userOpQueue.push(userOp);
    res.json({ status: 'UserOp added to queue' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Cron job that runs every 5 seconds
// Cron job that runs every 5 seconds
cron.schedule('*/5 * * * * *', async () => {
    console.log('Running the cron job...');
    try {
        const signer = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic);

        const client = await SigningCosmWasmClient.connectWithSigner(endpoint, signer);
        const [firstAccount] = await signer.getAccounts();
        console.log(firstAccount.address)
        const incrementMsgs = []; // Array to store the EncodeObject from userOpQueue
        while (userOpQueue.length > 0) {
            const userOp: any = userOpQueue.shift();  // Removes the first element from the array

            // Assuming userOp can be transformed into an EncodeObject, we add to incrementMsgs
            // You might need to modify the below transformation based on your actual data structure.
            incrementMsgs.push({
                typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
                value: {
                    sender: firstAccount,
                    contract: entrypointContract,
                    msg: Buffer.from(JSON.stringify(userOp)).toString("base64"),
                    sent_funds: [],
                }
            });
        }
        console.log('test')
        // signingClient.wasmClient.sign
        if (incrementMsgs.length > 0) {
            console.log('bundling.....')
            const fee = {
                amount: [{ amount: '5000', denom: 'unibi' }],  // Define appropriate fees
                gas: '200000',  // Define appropriate gas limit
            };
    
            const result = await client.execute(firstAccount.address, endpoint, incrementMsgs, fee);
            console.log(result)
            console.log(`Sent ${incrementMsgs.length} messages to the blockchain.`);
        } else {
            console.log('No messages to send.');
        }   
    } catch(err) {
        console.log(err)
    }
});