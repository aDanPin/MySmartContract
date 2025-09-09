# Smart Contracts

## CharacterSheetToken.sol
ERC721 NFT contract that tokenizes RPG characters, combining character management with NFT functionality.

**Key Features:**
- Inherits from CharacterSheet.sol for full character management
- ERC721 standard implementation for NFT functionality
- Ownership-based character updates
- Metadata URI support

```
4cf3d3c5b83f4eafc583b5ff93568f09492859cc change of storing policy couse +16.2 gas usage in 
"Gas: mint one char, update 50 times, get char" test case. However, if we accept that data
will be read much more often than written, it is worth leaving this change, because this method
of storage makes reading twice as cheap.

Gas mint: 142382 => 186103 (+30%)
Everage update gas: 83432 => 104781 (+25.6%)
Gas getCharacter + getLastAbilityScores =>  getLastCharacterShot : 42960 => 21480 (-50%)
Everage 268,774 => 312,364 (+16.2)
```

**Functions:**
- `mintCharacter()` - Create and mint character as NFT
- `updateCharacter()` - Update character stats (owner only)
- `getTokenCharacter()` - Get character data for token
- `ownerOf()` - Get token owner
- `transferFrom()` - Transfer character ownership

## Bet.sol
Decentralized betting platform with **Merkle proof verification** and **PRB/Math safe operations**.

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

