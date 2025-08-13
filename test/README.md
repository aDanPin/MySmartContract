# Tests

Comprehensive test suite for smart contracts using Hardhat.

## Test Files

### Bet.js
Tests for the betting platform contract:
- Contract deployment
- Bet round creation
- Bet round finishing
- Winner determination
- Fee and win distribution
- E2E tests in "Complex Bet Round Gas Measurement"

### CharacterSheet.js
Tests for the character management contract:
- Character creation and validation
- Ability score updates
- Level progression
- Gas mesurement tests

## Running Tests

```bash
npx hardhat test
npx hardhat test test/Bet.js
npx hardhat test test/CharacterSheet.js
```

## Test Coverage
- Unit tests for all public functions
- Modifier validation
- Error condition testing
- Integration scenarios
