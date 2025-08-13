# Smart Contracts

## Bet.sol
Decentralized betting platform allowing users to create and participate in betting rounds.

### Features
- Create betting rounds with custom fees
- Place bets on X or Y outcomes
- Fee and win distribution system

### Key Functions
- `createBetRound()` - Create new betting round
- `placeBet()` - Place bets on outcomes
- `resolveBetRound()` - End round and distributinng wins
- `claimWin()` - Claim reward for certain contracts

## CharacterSheet.sol
RPG character management system for storing character data and ability scores.

### Features
- Character creation with name, level, race, class, ability score
- History of ability score and level updates

### Key Functions
- `createCharacter()` - Create new character
- `addChangeCharacter()` - Update character stats
- `getCharacter()` - Retrieve character data
- `getAbilityScoresHistory()` - Recive ability score history

