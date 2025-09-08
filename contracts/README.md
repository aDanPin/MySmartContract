# Smart Contracts

## CharacterSheetToken.sol
ERC721 NFT contract that tokenizes RPG characters, combining character management with NFT functionality.

**Key Features:**
- Inherits from CharacterSheet.sol for full character management
- ERC721 standard implementation for NFT functionality
- Ownership-based character updates
- Metadata URI support

**Functions:**
- `mintCharacter()` - Create and mint character as NFT
- `updateCharacter()` - Update character stats (owner only)
- `getTokenCharacter()` - Get character data for token
- `ownerOf()` - Get token owner
- `transferFrom()` - Transfer character ownership

## Bet.sol
Decentralized betting platform with Merkle proof verification and PRB/Math safe operations.

**Functions:**
- `createBetRound()` - Create betting round
- `placeBet()` - Place bet
- `resolveBetRound()` - End round
- `claimWin()` - Claim reward

## CharacterSheet.sol
RPG character management system.

**Functions:**
- `createCharacter()` - Create character
- `addChangeCharacter()` - Update stats
- `getCharacter()` - Get character data
- `getAbilityScoresHistory()` - Get history

