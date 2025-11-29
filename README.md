# HackChain

A decentralized hackathon management platform built on Monad blockchain, featuring NFT tickets, on-chain event management, and real-time data synchronization.

## 🌟 Features

- **Blockchain-Based Event Management**: Create and manage hackathons on Monad testnet
- **NFT Tickets**: Issue unique NFT tickets to participants with QR code check-in
- **Smart Contract Integration**: Fully on-chain event lifecycle and participant tracking
- **Real-Time Sync**: WebSocket-based blockchain event synchronization to backend
- **Sponsor System**: On-chain sponsorship tracking and management
- **Check-In System**: QR code-based participant check-in with mobile scanner

## 🏗️ Architecture

```
HackChain/
├── backend/          # Go backend service with blockchain sync
├── contract/         # Solidity smart contracts (Hardhat)
├── frontend/         # React + Vite frontend application
└── doc/             # Documentation
```

### Technology Stack

**Frontend**
- React 19 + Vite
- Material-UI (MUI)
- Ethers.js v6
- React Router v7
- TanStack Query
- HTML5 QRCode Scanner

**Backend**
- Go 1.21+
- Gin Web Framework
- GORM (MySQL ORM)
- go-ethereum (Blockchain client)
- WebSocket event subscription

**Smart Contracts**
- Solidity 0.8.27
- Hardhat
- OpenZeppelin Contracts
- Monad Testnet

**Database**
- MySQL 8.0+

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- Go 1.21+
- MySQL 8.0+
- MetaMask wallet
- Monad testnet RPC access

### 1. Clone Repository

```bash
git clone https://github.com/zhiming817/HackChain.git
cd HackChain
```

### 2. Deploy Smart Contracts

```bash
cd contract
pnpm install

# Configure your private key in .env
cp .env.example .env

# Deploy to Monad testnet
pnpm hardhat run scripts/deploy.js --network monad
```

Save the deployed contract addresses for the next steps.

### 3. Setup Backend

```bash
cd ../backend/go-backend

# Configure environment
cp .env.example .env
# Edit .env with your database and contract addresses

# Create database
mysql -u root -p
CREATE DATABASE hackathon CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
exit;

# Run backend (will auto-migrate tables)
go run main.go
```

Backend will start on `http://localhost:8080`

### 4. Setup Frontend

```bash
cd ../../frontend/web
pnpm install

# Configure contract addresses in src/config.js
# Update HACKATHON_CONTRACT_ADDRESS and NFT_TICKET_CONTRACT_ADDRESS

# Start development server
pnpm dev
```

Frontend will start on `http://localhost:5173`

## 📦 Smart Contracts

### Hackathon.sol

Main contract for hackathon event management.

**Key Features:**
- Create events with metadata
- Register participants
- Manage sponsors
- Issue NFT tickets
- Check-in system
- Event lifecycle management

**Events:**
- `EventCreated(uint256 indexed eventId, address indexed organizer, ...)`
- `ParticipantRegistered(uint256 indexed eventId, address indexed participant, ...)`
- `SponsorAdded(uint256 indexed eventId, address indexed sponsor, ...)`
- `ParticipantCheckedIn(uint256 indexed eventId, address indexed participant, ...)`

### NFTTicket.sol

ERC721-based NFT ticket system.

**Key Features:**
- Issue unique NFT tickets per participant
- One ticket per participant per event
- Ticket metadata with event details
- QR code generation for check-in

## 🔌 API Endpoints

### Health Check
- `GET /health` - Service health status

### Events
- `GET /api/events` - Get all events
- `GET /api/events/:id` - Get event by ID
- `GET /api/events/organizer?organizer=0x...` - Get events by organizer
- `GET /api/events/:id/participants` - Get event participants
- `GET /api/events/:id/sponsors` - Get event sponsors
- `GET /api/events/:id/tickets` - Get event NFT tickets

### Statistics
- `GET /api/stats` - Get sync statistics

## 🔄 Data Synchronization

The backend uses WebSocket subscriptions to listen for blockchain events in real-time:

1. **WebSocket Connection**: Maintains persistent connection to Monad RPC
2. **Event Filtering**: Subscribes to Hackathon contract events
3. **Data Processing**: Parses event logs and extracts data
4. **Database Storage**: Stores processed data in MySQL
5. **Heartbeat**: Keeps connection alive with periodic pings

**Supported Events:**
- EventCreated
- ParticipantRegistered
- SponsorAdded
- ParticipantCheckedIn
- EventUpdated
- EventCancelled

## 🎫 NFT Ticket System

Each registered participant receives an NFT ticket with:
- Unique Token ID (generated from event ID + participant address hash)
- Event metadata (title, location, time)
- QR code for check-in
- Transfer restrictions (one per participant per event)

**Check-In Flow:**
1. Participant shows QR code (contains ticket token ID)
2. Scanner reads QR code
3. Frontend verifies ticket ownership
4. Backend marks participant as checked in
5. Smart contract records check-in timestamp

## 🔧 Configuration

### Backend (.env)

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=hackathon

# Blockchain
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
HACKATHON_CONTRACT_ADDRESS=0x...
NFT_TICKET_CONTRACT_ADDRESS=0x...

# Server
SERVER_PORT=8080
```

### Frontend (src/config.js)

```javascript
export const HACKATHON_CONTRACT_ADDRESS = "0x...";
export const NFT_TICKET_CONTRACT_ADDRESS = "0x...";
export const MONAD_RPC_URL = "https://testnet-rpc.monad.xyz";
```

## 📱 Mobile Check-In Scanner

The mobile scanner uses HTML5 QRCode library:

1. Open scanner page on mobile device
2. Grant camera permissions
3. Scan participant's QR code
4. View participant details and check-in status
5. Confirm check-in on blockchain

## 🔐 Security Considerations

- **Contract Ownership**: Only organizer can manage their events
- **Access Control**: Participants can only register once per event
- **NFT Restrictions**: One ticket per participant per event
- **Check-In Validation**: Only event organizer can check in participants
- **Foreign Key Disabled**: Backend uses programmatic referential integrity

## 🐛 Troubleshooting

### Backend won't start
- Ensure MySQL is running and database exists
- Verify contract addresses in .env
- Check Monad RPC URL is accessible

### Frontend can't connect to MetaMask
- Add Monad testnet to MetaMask
- Ensure you have testnet MON tokens
- Check contract addresses in config.js

### Events not syncing
- Check backend logs for WebSocket errors
- Verify contract addresses match deployment
- Ensure RPC WebSocket endpoint is available

### Database ID overflow
- IDs are stored as VARCHAR(100) to handle uint256 hashes
- Don't manually modify event_id or token_id columns

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

For questions or support, please open an issue on GitHub.

## 🙏 Acknowledgments

- Monad testnet for blockchain infrastructure
- OpenZeppelin for secure smart contract libraries
- The entire Web3 community
