import { createPublicClient, http, createWalletClient, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { ponder } from "ponder:registry";

// Define the ABI for the indexer contract
const IndexerContractAbi = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "eventId",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "poapId",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "indexPoapMint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "eventId",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "hasPoap",
    outputs: [
      {
        internalType: "uint256",
        name: "poapId",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "eventId",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "PoapNotIndexed",
    type: "error",
  },
] as const;
// import { tokens } from "ponder:schema";

console.log("!!");

// Create public client for reading from blockchain
const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.PONDER_RPC_URL_8453),
});

// Create wallet client for sending transactions
const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
const walletClient = createWalletClient({
  account,
  chain: base,
  transport: http(process.env.PONDER_RPC_URL_8453),
});

// Indexer contract address
const INDEXER_CONTRACT_ADDRESS =
  "0x1cE83EAA58C8ce9e94e9766EbB36527872c7b54b" as `0x${string}`;

// Get the target event IDs from environment variable (comma-separated)
const TARGET_EVENT_IDS = (process.env.TARGET_EVENT_ID || "190857")
  .split(",")
  .map((id) => id.trim())
  .filter((id) => id.length > 0)
  .map((id) => BigInt(id));

console.log(
  `🎯 Monitoring POAP events for event IDs: ${TARGET_EVENT_IDS.join(", ")}`
);

ponder.on(
  "Poap:Mint",
  async ({ event, context }: { event: any; context: any }) => {
    const { eventId, poapId, owner } = event.args;

    // Only process events for the specific event IDs
    if (!TARGET_EVENT_IDS.includes(eventId)) {
      return;
    }

    console.log(
      `Processing POAP mint: Event ID ${eventId}, POAP ID ${poapId}, Owner ${owner}`
    );

    try {
      // Check if the POAP is already indexed
      let existingPoapId: bigint;
      try {
        existingPoapId = await publicClient.readContract({
          address: INDEXER_CONTRACT_ADDRESS,
          abi: IndexerContractAbi,
          functionName: "hasPoap",
          args: [eventId, owner],
        });

        // If hasPoap returns a non-zero poapId, the POAP is already indexed
        if (existingPoapId > 0n) {
          console.log(
            `POAP already indexed for Event ID ${eventId}, Owner ${owner}. Existing POAP ID: ${existingPoapId}. Skipping...`
          );
          return;
        }
      } catch (hasPoapError) {
        // If hasPoap throws PoapNotIndexed error, it means the POAP hasn't been indexed yet
        if (
          hasPoapError &&
          typeof hasPoapError === "object" &&
          "message" in hasPoapError &&
          typeof hasPoapError.message === "string" &&
          (hasPoapError.message.includes("PoapNotIndexed") ||
            hasPoapError.message.includes("0xf48c31b0"))
        ) {
          console.log(`POAP not indexed yet. Proceeding with indexing...`);
        } else {
          // If it's a different error, re-throw it
          throw hasPoapError;
        }
      }

      // Get current nonce
      const nonce = await publicClient.getTransactionCount({
        address: account.address,
      });

      // Estimate gas for the transaction
      const gasEstimate = await publicClient.estimateContractGas({
        address: INDEXER_CONTRACT_ADDRESS,
        abi: IndexerContractAbi,
        functionName: "indexPoapMint",
        args: [eventId, poapId, owner],
        account: account.address,
      });

      // Get current gas price and add a premium to avoid replacement issues
      const gasPrice = await publicClient.getGasPrice();
      const adjustedGasPrice = (gasPrice * 120n) / 100n; // 20% premium

      // Call the indexer contract with proper gas and pricing
      const hash = await walletClient.writeContract({
        address: INDEXER_CONTRACT_ADDRESS,
        abi: IndexerContractAbi,
        functionName: "indexPoapMint",
        args: [eventId, poapId, owner],
        gas: gasEstimate,
        gasPrice: adjustedGasPrice,
        nonce: nonce,
      });

      console.log(
        `Successfully called indexPoapMint. Transaction hash: ${hash}`
      );

      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
    } catch (error) {
      console.error(`Error processing POAP mint:`, error);

      // If it's a replacement transaction error, we can retry with higher gas price
      if (
        error &&
        typeof error === "object" &&
        "message" in error &&
        typeof error.message === "string" &&
        error.message.includes("replacement transaction underpriced")
      ) {
        console.log("Retrying with higher gas price...");

        try {
          const gasPrice = await publicClient.getGasPrice();
          const retryGasPrice = (gasPrice * 150n) / 100n; // 50% premium for retry

          const hash = await walletClient.writeContract({
            address: INDEXER_CONTRACT_ADDRESS,
            abi: IndexerContractAbi,
            functionName: "indexPoapMint",
            args: [eventId, poapId, owner],
            gasPrice: retryGasPrice,
          });

          console.log(`Retry successful. Transaction hash: ${hash}`);
        } catch (retryError) {
          console.error(`Retry failed:`, retryError);
        }
      }
    }
  }
);
