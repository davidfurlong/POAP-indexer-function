// This project doesn't need to store data in a database
// It only checks if POAPs are already indexed and calls the indexer contract
// Creating a minimal schema to satisfy Ponder's requirements

export default {
  // Minimal table to satisfy Ponder's database requirements
  Event: {
    id: "string",
    blockNumber: "bigint",
    timestamp: "bigint",
  },
};
