# MySmartContract

A comprehensive Solidity smart contract project featuring a decentralized betting platform and RPG character sheet management system. Built with Hardhat framework and OpenZeppelin contracts.

## Overview

This project contains two main smart contracts:
- **CharacterSheetToken.sol** - (WIP) An ERC721 token designed for use within the CharacterSheet.sol betting platform. The token contract will follow the OpenZeppelin ERC721 standard for security and interoperability.

- **Bet.sol** - A decentralized betting platform with support for binary outcomes, creator fees, and Merkle tree-based winner verification
- **CharacterSheet.sol** - An RPG character sheet system for managing D&D-style characters with ability scores and progression

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Compile contracts**
   ```bash
   npx hardhat compile
   ```

3. **Run tests**
   ```bash
   npx hardhat test
   ```

## Project Structure

```
MySmartContract/
├── contracts/
│   ├── Bet.sol              # Decentralized betting platform
│   └── CharacterSheet.sol   # RPG character management
├── test/
│   ├── Bet.js              # Bet contract tests
│   └── CharacterSheet.js   # CharacterSheet contract tests
├── hardhat.config.js       # Hardhat configuration
└── package.json           # Dependencies and scripts
```

## Smart Contracts

### Bet.sol - Decentralized Betting Platform

**Features:**
- Create betting rounds with binary outcomes (X vs Y)
- Support for creator fees (configurable percentage)
- Merkle tree-based winner verification
- Automatic pool distribution to winners
- Round state management (active, cancelled, completed)

**Key Functions:**
- `createBetRound()` - Create a new betting round
- `placeBet()` - Place a bet on outcome X or Y
- `endBetRound()` - End a betting round and set the outcome
- `claimWin()` - Claim winnings using Merkle proof
- `claimCreatorFee()` - Claim creator fees (WIP)

### CharacterSheet.sol - RPG Character Management

**Features:**
- Create and manage D&D-style character sheets
- Support for 16 different race/class combinations
- Track ability scores (STR, DEX, CON, INT, WIS, CHA)
- Character progression and level tracking
- Historical ability score changes

**Key Functions:**
- `createCharacter()` - Create a new character
- `updateAbilityScores()` - Update character stats
- `getCharacter()` - Retrieve character information
- `getAbilityScoresHistory()` - View character progression

## Testing

Run the complete test suite:

```bash
npx hardhat test
```

Run specific test files:

```bash
npx hardhat test test/Bet.js
npx hardhat test test/CharacterSheet.js
```

## Dependencies

**Core Dependencies:**
- `@openzeppelin/contracts` - Secure smart contract libraries
- `ethers` - Ethereum library for interacting with smart contracts
- `@prb/math` - Fixed-point arithmetic library

**Development Dependencies:**
- `hardhat` - Ethereum development environment
- `@nomicfoundation/hardhat-toolbox` - Hardhat plugins and tools

## Security

- Contracts use OpenZeppelin's battle-tested libraries
- Comprehensive test coverage for all functions
- Access control modifiers for sensitive operations
- Merkle tree implementation for efficient winner verification

## License

This project is licensed under the MIT License.

