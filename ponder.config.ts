import { createConfig } from "ponder";
import PoapAbi from "./abis/Poap.json";
import IndexerContractAbi from "./abis/IndexerContract.json";

export default createConfig({
  database: {
    kind: "pglite",
  },
  chains: {
    base: {
      id: 8453,
      rpc: process.env.PONDER_RPC_URL_8453,
    },
  },
  contracts: {
    Poap: {
      chain: "base",
      abi: PoapAbi as any,
      address: "0x22C1f6050E56d2876009903609a2cC3fEf83B415",
      startBlock: 23049780,
    },
    IndexerContract: {
      chain: "base",
      abi: IndexerContractAbi as any,
      address: "0x1cE83EAA58C8ce9e94e9766EbB36527872c7b54b",
      startBlock: 23049780,
    },
  },
});
