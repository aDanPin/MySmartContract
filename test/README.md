# Tests

Smart contract test suite using Hardhat framework.

## Test Files

### Bet.js
Tests for the betting platform contract:
- Contract deployment
- Bet round creation and management
- Bet round finishing
- Winner determination
- Fee and win distribution
- E2E tests in "Complex Bet Round Gas Measurement"

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
npx hardhat test test/Bet.js
npx hardhat test test/CharacterSheet.js
```