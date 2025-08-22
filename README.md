# POAP Indexer

A Ponder.sh indexer that listens to POAP mint events on the Base blockchain and calls a custom smart contract to index specific events. The indexer checks if POAPs are already indexed before processing to avoid duplicate transactions.

## Features

- Listens to POAP `Mint` events on Base blockchain
- Filters events by specific `eventId`s (configurable via comma-separated environment variable)
- Checks if POAPs are already indexed using the `hasPoap` function
- Calls your custom indexer contract with the mint data only if not already indexed
- Skips processing if the POAP is already indexed to avoid duplicate transactions
- No database storage required - all state is managed on-chain

## Prerequisites

- Node.js 18+
- npm or yarn
- A Base RPC endpoint (Alchemy, Infura, etc.)
- A private key with funds on Base for transaction signing
- Ponder v0.12.x

## Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Copy environment template:**

   ```bash
   cp env.example .env
   ```

3. **Configure environment variables:**
   Edit `.env` and set the following:

   - `PONDER_RPC_URL_8453`: Your Base RPC URL
   - `PRIVATE_KEY`: Your private key (without 0x prefix)
   - `TARGET_EVENT_ID`: The event IDs to filter for (comma-separated, default: 190857)

4. **Generate Ponder types:**
   ```bash
   npm run codegen
   ```

## Usage

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm run start
```

## Configuration

### Contracts

- **POAP Proxy Contract**: `0x22C1f6050E56d2876009903609a2cC3fEf83B415`
- **POAP Implementation**: `0xdd3c426fa842f890bcb793da6ccd749edb09c44b`
- **Your Indexer Contract**: `0x1cE83EAA58C8ce9e94e9766EbB36527872c7b54b`

### Events Monitored

The indexer listens to the `Mint` event from the POAP contract:

```solidity
event Mint(
    uint256 indexed eventId,
    uint256 indexed poapId,
    address indexed owner
);
```

### Event Filtering

The indexer supports monitoring multiple event IDs simultaneously. Set the `TARGET_EVENT_ID` environment variable as a comma-separated list:

```bash
# Monitor a single event
TARGET_EVENT_ID=190857

# Monitor multiple events
TARGET_EVENT_ID=190857,190858,190859,123456
```

### Indexer Contract Functions

The indexer uses two functions from your contract:

1. **Check if already indexed:**

```solidity
function hasPoap(
    uint256 eventId,
    address account
) external view returns (uint256 poapId)
```

2. **Index the POAP:**

```solidity
function indexPoapMint(
    uint256 eventId,
    uint256 poapId,
    address account
)
```

## How It Works

1. **Event Detection**: The indexer listens for POAP `Mint` events on the Base blockchain
2. **Event Filtering**: Only processes events matching the configured `TARGET_EVENT_ID`s
3. **Duplicate Check**: Calls `hasPoap(eventId, owner)` to check if the POAP is already indexed
4. **Skip if Indexed**: If `hasPoap` returns a non-zero `poapId`, the event is skipped
5. **Index if New**: If not indexed, calls `indexPoapMint(eventId, poapId, owner)` to index the POAP
6. **Logging**: Provides detailed logs for all operations and decisions

## Security Notes

- Never commit your `.env` file to version control
- Ensure your private key has sufficient funds for gas fees
- Consider using a dedicated wallet for the indexer
- Monitor the indexer logs for any errors

## Troubleshooting

### Common Issues

1. **RPC Connection Errors**: Check your RPC URL and ensure it supports Base mainnet
2. **Insufficient Funds**: Ensure your wallet has enough ETH for gas fees
3. **Contract Call Failures**: Check that your indexer contract is deployed and accessible
4. **Event Filtering**: Verify the `TARGET_EVENT_ID` contains the event IDs you want to index (comma-separated)

### Logs

The indexer provides detailed logging:

- Event detection and filtering
- Duplicate check results
- Contract call results
- Error messages and stack traces

## License

MIT
