# Tests

Smart contract test suite using Hardhat framework.

## Test Files

### CharacterSheetToken.js
Tests for the ERC721 character token contract:
- Contract deployment
- Character minting as NFTs
- Token ownership verification
- Character updates by token owners
- Transfer functionality
- Access control validation

### Bet.js
Tests for the betting platform contract:
- E2E test.
- Contract deployment
- Bet round creation and management
- Bet round finishing
- Winner determination
- Fee and win distribution

### CharacterSheet.js
Tests for the character management contract:
- Contract deployment
- Character creation and validation
- Ability score updates
- Level progression
- Gas measurement tests

## Running Tests

Run all tests:
```bash
npx hardhat test
```

Run specific test file:
```bash
npx hardhat test test/CharacterSheetToken.js
npx hardhat test test/Bet.js
npx hardhat test test/CharacterSheet.js
```