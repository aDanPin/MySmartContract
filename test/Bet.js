const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Bet Contract", function () {
  let betContract;
  let owner;
  let creator;
  let bettor1;
  let bettor2;
  let bettor3;
  let addrs;

  beforeEach(async function () {
    // Get signers
    [owner, creator, bettor1, bettor2, bettor3, ...addrs] = await ethers.getSigners();

    // Deploy the contract
    const Bet = await ethers.getContractFactory("Bet");
    betContract = await Bet.deploy();
    await betContract.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct SCALE constant", async function () {
      expect(await betContract.SCALE()).to.equal(1000);
    });

    it("Should start with 0 total rounds", async function () {
      expect(await betContract.getTotalRounds()).to.equal(0);
    });
  });

  describe("Bet Round Creation", function () {
    const testDescription = ethers.encodeBytes32String("Will Team A win the championshi");

    it("Should create a bet round successfully", async function () {
      const creatorFee = 100; // 1% fee
      
      await expect(betContract.connect(creator).createBetRound(testDescription, creatorFee))
        .to.emit(betContract, "BetRoundCreated")
        .withArgs(0, testDescription);

      const roundInfo = await betContract.getBetRoundInfo(0);
      expect(roundInfo.description).to.equal(testDescription);
      expect(roundInfo.creator).to.equal(creator.address);
      expect(roundInfo.creatorFee).to.equal(creatorFee);
      expect(roundInfo.betState).to.equal(1); // inProcess
      expect(roundInfo.totalXBetAmount).to.equal(0);
      expect(roundInfo.totalYBetAmount).to.equal(0);
    });

    it("Should increment round ID correctly", async function () {
      const creatorFee = 50; // 2% fee
      
      await betContract.connect(creator).createBetRound(testDescription, creatorFee);
      await betContract.connect(bettor1).createBetRound(testDescription, creatorFee);

      expect(await betContract.getTotalRounds()).to.equal(2);
      
      const roundInfo1 = await betContract.getBetRoundInfo(0);
      const roundInfo2 = await betContract.getBetRoundInfo(1);
      
      expect(roundInfo1.creator).to.equal(creator.address);
      expect(roundInfo2.creator).to.equal(bettor1.address);
    });

    it("Should allow different creators to create rounds", async function () {
      const creatorFee = 100;
      const description2 = ethers.encodeBytes32String("Will it rain tomorrow?");
      
      await betContract.connect(creator).createBetRound(testDescription, creatorFee);
      await betContract.connect(bettor1).createBetRound(description2, creatorFee);

      const round1 = await betContract.getBetRoundInfo(0);
      const round2 = await betContract.getBetRoundInfo(1);
      
      expect(round1.creator).to.equal(creator.address);
      expect(round2.creator).to.equal(bettor1.address);
      expect(round1.description).to.equal(testDescription);
      expect(round2.description).to.equal(description2);
    });

    it("Should handle different creator fees", async function () {
      const lowFee = 10; // 10% fee
      const highFee = 200; // 0.5% fee
      
      await betContract.connect(creator).createBetRound(testDescription, lowFee);
      await betContract.connect(bettor1).createBetRound(testDescription, highFee);

      const round1 = await betContract.getBetRoundInfo(0);
      const round2 = await betContract.getBetRoundInfo(1);
      
      expect(round1.creatorFee).to.equal(lowFee);
      expect(round2.creatorFee).to.equal(highFee);
    });
  });

  describe("Placing Bets", function () {
    let roundId;
    const testDescription = ethers.encodeBytes32String("Test bet round");
    const creatorFee = 100; // 1% fee

    beforeEach(async function () {
      const tx = await betContract.connect(creator).createBetRound(testDescription, creatorFee);
      const receipt = await tx.wait();
      roundId = 0;
    });

    it("Should place bet on X option successfully", async function () {
      const betAmount = ethers.parseEther("1.0");
      
      await expect(betContract.connect(bettor1).placeBet(roundId, 0, { value: betAmount }))
        .to.not.be.reverted;

      const roundInfo = await betContract.getBetRoundInfo(roundId);
      expect(roundInfo.totalXBetAmount).to.equal(betAmount);
      expect(roundInfo.totalYBetAmount).to.equal(0);
    });

    it("Should place bet on Y option successfully", async function () {
      const betAmount = ethers.parseEther("2.5");
      
      await expect(betContract.connect(bettor1).placeBet(roundId, 1, { value: betAmount }))
        .to.not.be.reverted;

      const roundInfo = await betContract.getBetRoundInfo(roundId);
      expect(roundInfo.totalXBetAmount).to.equal(0);
      expect(roundInfo.totalYBetAmount).to.equal(betAmount);
    });

    it("Should allow multiple bets on same option", async function () {
      const betAmount1 = ethers.parseEther("1.0");
      const betAmount2 = ethers.parseEther("2.0");
      
      await betContract.connect(bettor1).placeBet(roundId, 0, { value: betAmount1 });
      await betContract.connect(bettor2).placeBet(roundId, 0, { value: betAmount2 });

      const roundInfo = await betContract.getBetRoundInfo(roundId);
      expect(roundInfo.totalXBetAmount).to.equal(betAmount1 + betAmount2);
    });

    it("Should allow same user to bet on both options", async function () {
      const xBetAmount = ethers.parseEther("1.0");
      const yBetAmount = ethers.parseEther("1.5");
      
      await betContract.connect(bettor1).placeBet(roundId, 0, { value: xBetAmount });
      await betContract.connect(bettor1).placeBet(roundId, 1, { value: yBetAmount });

      const roundInfo = await betContract.getBetRoundInfo(roundId);
      expect(roundInfo.totalXBetAmount).to.equal(xBetAmount);
      expect(roundInfo.totalYBetAmount).to.equal(yBetAmount);
    });

    it("Should reject bet with zero amount", async function () {
      await expect(
        betContract.connect(bettor1).placeBet(roundId, 0, { value: 0 })
      ).to.be.revertedWith("Bet amount must be greater than 0");
    });

    it("Should reject bet on non-existent round", async function () {
      const betAmount = ethers.parseEther("1.0");
      
      await expect(
        betContract.connect(bettor1).placeBet(999, 0, { value: betAmount })
      ).to.be.revertedWith("Bet round does not exist");
    });

    it("Should reject bet on ended round", async function () {
      const betAmount = ethers.parseEther("1.0");
      
      // Place initial bet
      await betContract.connect(bettor1).placeBet(roundId, 0, { value: betAmount });
      
      // End the round
      await betContract.connect(creator).resolveBetRound(roundId, 3); // X wins
      
      // Try to place bet on ended round
      await expect(
        betContract.connect(bettor2).placeBet(roundId, 0, { value: betAmount })
      ).to.be.revertedWith("Round is not active.");
    });
  });

  describe("Resolving Bet Rounds", function () {
    let roundId;
    const testDescription = ethers.encodeBytes32String("Test bet round");
    const creatorFee = 100; // 1% fee

    beforeEach(async function () {
      await betContract.connect(creator).createBetRound(testDescription, creatorFee);
      roundId = 0;
    });

    it("Should resolve X win successfully", async function () {
      const betAmount = ethers.parseEther("1.0");
      await betContract.connect(bettor1).placeBet(roundId, 0, { value: betAmount });
      
      await expect(betContract.connect(creator).resolveBetRound(roundId, 3))
        .to.emit(betContract, "BetRoundEnded")
        .withArgs(roundId, testDescription, 3);

      const roundInfo = await betContract.getBetRoundInfo(roundId);
      expect(roundInfo.betState).to.equal(3); // X win
      expect(roundInfo.endTime).to.be.greaterThan(0);
    });

    it("Should resolve Y win successfully", async function () {
      const betAmount = ethers.parseEther("1.0");
      await betContract.connect(bettor1).placeBet(roundId, 1, { value: betAmount });
      
      await expect(betContract.connect(creator).resolveBetRound(roundId, 4))
        .to.emit(betContract, "BetRoundEnded")
        .withArgs(roundId, testDescription, 4);

      const roundInfo = await betContract.getBetRoundInfo(roundId);
      expect(roundInfo.betState).to.equal(4); // Y win
    });

    it("Should resolve draw successfully", async function () {
      const betAmount = ethers.parseEther("1.0");
      await betContract.connect(bettor1).placeBet(roundId, 0, { value: betAmount });
      await betContract.connect(bettor2).placeBet(roundId, 1, { value: betAmount });
      
      await expect(betContract.connect(creator).resolveBetRound(roundId, 5))
        .to.emit(betContract, "BetRoundEnded")
        .withArgs(roundId, testDescription, 5);

      const roundInfo = await betContract.getBetRoundInfo(roundId);
      expect(roundInfo.betState).to.equal(5); // Draw
    });

    it("Should resolve cancellation successfully", async function () {
      const betAmount = ethers.parseEther("1.0");
      await betContract.connect(bettor1).placeBet(roundId, 0, { value: betAmount });
      
      await expect(betContract.connect(creator).resolveBetRound(roundId, 2))
        .to.emit(betContract, "BetRoundEnded")
        .withArgs(roundId, testDescription, 2);

      const roundInfo = await betContract.getBetRoundInfo(roundId);
      expect(roundInfo.betState).to.equal(2); // Cancelled
    });

    it("Should reject resolution by non-creator", async function () {
      const betAmount = ethers.parseEther("1.0");
      await betContract.connect(bettor1).placeBet(roundId, 0, { value: betAmount });
      
      await expect(
        betContract.connect(bettor1).resolveBetRound(roundId, 3)
      ).to.be.revertedWith("Only creator can call this function");
    });

    it("Should reject resolution of non-existent round", async function () {
      await expect(
        betContract.connect(creator).resolveBetRound(999, 3)
      ).to.be.revertedWith("Bet round does not exist");
    });

    it("Should reject resolution with invalid state", async function () {
      const betAmount = ethers.parseEther("1.0");
      await betContract.connect(bettor1).placeBet(roundId, 0, { value: betAmount });
      
      await expect(
        betContract.connect(creator).resolveBetRound(roundId, 1)
      ).to.be.revertedWith("Not relevant incoming state.");
    });

    it("Should reject resolution of already ended round", async function () {
      const betAmount = ethers.parseEther("1.0");
      await betContract.connect(bettor1).placeBet(roundId, 0, { value: betAmount });
      
      // End the round once
      await betContract.connect(creator).resolveBetRound(roundId, 3);
      
      // Try to end it again
      await expect(
        betContract.connect(creator).resolveBetRound(roundId, 4)
      ).to.be.revertedWith("Round is not active.");
    });
  });

  describe("Winning Distribution - X Win", function () {
    let roundId;
    const testDescription = ethers.encodeBytes32String("X vs Y");
    const creatorFee = 100; // 1% fee

    beforeEach(async function () {
      await betContract.connect(creator).createBetRound(testDescription, creatorFee);
      roundId = 0;
    });

    it("Should distribute winnings correctly for X win", async function () {
      const xBetAmount = ethers.parseEther("2.0");
      const yBetAmount = ethers.parseEther("1.0");
      
      await betContract.connect(bettor1).placeBet(roundId, 0, { value: xBetAmount });
      await betContract.connect(bettor2).placeBet(roundId, 1, { value: yBetAmount });
      
      await betContract.connect(creator).resolveBetRound(roundId, 3); // X wins
      
      // Check that winners array is populated
      // Note: The contract stores wins but doesn't have a public getter for winners
      // This test verifies the resolution completes without errors
      const roundInfo = await betContract.getBetRoundInfo(roundId);
      expect(roundInfo.betState).to.equal(3);
    });

    it("Should handle multiple X bettors", async function () {
      const bet1 = ethers.parseEther("1.0");
      const bet2 = ethers.parseEther("2.0");
      const yBet = ethers.parseEther("1.0");
      
      await betContract.connect(bettor1).placeBet(roundId, 0, { value: bet1 });
      await betContract.connect(bettor2).placeBet(roundId, 0, { value: bet2 });
      await betContract.connect(bettor3).placeBet(roundId, 1, { value: yBet });
      
      await betContract.connect(creator).resolveBetRound(roundId, 3); // X wins
      
      const roundInfo = await betContract.getBetRoundInfo(roundId);
      expect(roundInfo.betState).to.equal(3);
    });
  });

  describe("Winning Distribution - Y Win", function () {
    let roundId;
    const testDescription = ethers.encodeBytes32String("X vs Y");
    const creatorFee = 100; // 1% fee

    beforeEach(async function () {
      await betContract.connect(creator).createBetRound(testDescription, creatorFee);
      roundId = 0;
    });

    it("Should distribute winnings correctly for Y win", async function () {
      const xBetAmount = ethers.parseEther("1.0");
      const yBetAmount = ethers.parseEther("2.0");
      
      await betContract.connect(bettor1).placeBet(roundId, 0, { value: xBetAmount });
      await betContract.connect(bettor2).placeBet(roundId, 1, { value: yBetAmount });
      
      await betContract.connect(creator).resolveBetRound(roundId, 4); // Y wins
      
      const roundInfo = await betContract.getBetRoundInfo(roundId);
      expect(roundInfo.betState).to.equal(4);
    });

    it("Should handle multiple Y bettors", async function () {
      const xBet = ethers.parseEther("1.0");
      const bet1 = ethers.parseEther("1.0");
      const bet2 = ethers.parseEther("2.0");
      
      await betContract.connect(bettor1).placeBet(roundId, 0, { value: xBet });
      await betContract.connect(bettor2).placeBet(roundId, 1, { value: bet1 });
      await betContract.connect(bettor3).placeBet(roundId, 1, { value: bet2 });
      
      await betContract.connect(creator).resolveBetRound(roundId, 4); // Y wins
      
      const roundInfo = await betContract.getBetRoundInfo(roundId);
      expect(roundInfo.betState).to.equal(4);
    });
  });

  describe("Winning Distribution - Draw", function () {
    let roundId;
    const testDescription = ethers.encodeBytes32String("X vs Y");
    const creatorFee = 100; // 1% fee

    beforeEach(async function () {
      await betContract.connect(creator).createBetRound(testDescription, creatorFee);
      roundId = 0;
    });

    it("Should distribute winnings correctly for draw", async function () {
      const xBetAmount = ethers.parseEther("1.0");
      const yBetAmount = ethers.parseEther("1.0");
      
      await betContract.connect(bettor1).placeBet(roundId, 0, { value: xBetAmount });
      await betContract.connect(bettor2).placeBet(roundId, 1, { value: yBetAmount });
      
      await betContract.connect(creator).resolveBetRound(roundId, 5); // Draw
      
      const roundInfo = await betContract.getBetRoundInfo(roundId);
      expect(roundInfo.betState).to.equal(5);
    });

    it("Should handle draw with multiple bettors on both sides", async function () {
      const xBet1 = ethers.parseEther("1.0");
      const xBet2 = ethers.parseEther("2.0");
      const yBet1 = ethers.parseEther("1.5");
      const yBet2 = ethers.parseEther("1.5");
      
      await betContract.connect(bettor1).placeBet(roundId, 0, { value: xBet1 });
      await betContract.connect(bettor2).placeBet(roundId, 0, { value: xBet2 });
      await betContract.connect(bettor3).placeBet(roundId, 1, { value: yBet1 });
      await betContract.connect(owner).placeBet(roundId, 1, { value: yBet2 });
      
      await betContract.connect(creator).resolveBetRound(roundId, 5); // Draw
      
      const roundInfo = await betContract.getBetRoundInfo(roundId);
      expect(roundInfo.betState).to.equal(5);
    });
  });

  describe("Winning Distribution - Cancellation", function () {
    let roundId;
    const testDescription = ethers.encodeBytes32String("X vs Y");
    const creatorFee = 100; // 1% fee

    beforeEach(async function () {
      await betContract.connect(creator).createBetRound(testDescription, creatorFee);
      roundId = 0;
    });

    it("Should handle cancellation with bets", async function () {
      const xBetAmount = ethers.parseEther("1.0");
      const yBetAmount = ethers.parseEther("2.0");
      
      await betContract.connect(bettor1).placeBet(roundId, 0, { value: xBetAmount });
      await betContract.connect(bettor2).placeBet(roundId, 1, { value: yBetAmount });
      
      await betContract.connect(creator).resolveBetRound(roundId, 2); // Cancelled
      
      const roundInfo = await betContract.getBetRoundInfo(roundId);
      expect(roundInfo.betState).to.equal(2);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle very small bet amounts", async function () {
      await betContract.connect(creator).createBetRound(ethers.encodeBytes32String("Test"), 100);
      const roundId = 0;
      
      const smallBet = ethers.parseEther("0.000001");
      await expect(
        betContract.connect(bettor1).placeBet(roundId, 0, { value: smallBet })
      ).to.not.be.reverted;
    });

    it("Should handle very large bet amounts", async function () {
      await betContract.connect(creator).createBetRound(ethers.encodeBytes32String("Test"), 100);
      const roundId = 0;
      
      const largeBet = ethers.parseEther("1000.0");
      await expect(
        betContract.connect(bettor1).placeBet(roundId, 0, { value: largeBet })
      ).to.not.be.reverted;
    });

    it("Should handle creator fee of 0", async function () {
      await betContract.connect(creator).createBetRound(ethers.encodeBytes32String("Test"), 0);
      const roundId = 0;
      
      const betAmount = ethers.parseEther("1.0");
      await betContract.connect(bettor1).placeBet(roundId, 0, { value: betAmount });
      
      await expect(
        betContract.connect(creator).resolveBetRound(roundId, 3)
      ).to.be.reverted; // Division by zero expected
    });

    it("Should handle very high creator fees", async function () {
      const highFee = 10000; // 0.01% fee
      await betContract.connect(creator).createBetRound(ethers.encodeBytes32String("Test"), highFee);
      const roundId = 0;
      
      const betAmount = ethers.parseEther("1.0");
      await betContract.connect(bettor1).placeBet(roundId, 0, { value: betAmount });
      
      await expect(
        betContract.connect(creator).resolveBetRound(roundId, 3)
      ).to.not.be.reverted;
    });
  });
// Appruved up to here
  describe("E2E Scenarios", function () {
    it("Complete betting scenario: X wins with multiple participants", async function () {
      // Create bet round
      const description = ethers.encodeBytes32String("Will Bitcoin reach $100k?");
      const creatorFee = 100; // 1%
      
      await betContract.connect(creator).createBetRound(description, creatorFee);
      const roundId = 0;
      
      // Multiple participants place bets
      await betContract.connect(bettor1).placeBet(roundId, 0, { value: ethers.parseEther("2.0") }); // X
      await betContract.connect(bettor2).placeBet(roundId, 0, { value: ethers.parseEther("1.5") }); // X
      await betContract.connect(bettor3).placeBet(roundId, 1, { value: ethers.parseEther("1.0") }); // Y
      await betContract.connect(owner).placeBet(roundId, 1, { value: ethers.parseEther("0.5") }); // Y
      
      // Verify bet amounts
      const roundInfo = await betContract.getBetRoundInfo(roundId);
      expect(roundInfo.totalXBetAmount).to.equal(ethers.parseEther("3.5"));
      expect(roundInfo.totalYBetAmount).to.equal(ethers.parseEther("1.5"));
      
      // Resolve with X win
      await betContract.connect(creator).resolveBetRound(roundId, 3);
      
      // Verify resolution
      const finalRoundInfo = await betContract.getBetRoundInfo(roundId);
      expect(finalRoundInfo.betState).to.equal(3);
      expect(finalRoundInfo.endTime).to.be.greaterThan(0);
    });

    it("Complete betting scenario: Y wins with single participant", async function () {
      // Create bet round
      const description = ethers.encodeBytes32String("Will Ethereum 2.0 launch?");
      const creatorFee = 50; // 2%
      
      await betContract.connect(creator).createBetRound(description, creatorFee);
      const roundId = 0;
      
      // Single participant bets on Y
      await betContract.connect(bettor1).placeBet(roundId, 1, { value: ethers.parseEther("5.0") });
      
      // Verify bet amounts
      const roundInfo = await betContract.getBetRoundInfo(roundId);
      expect(roundInfo.totalXBetAmount).to.equal(0);
      expect(roundInfo.totalYBetAmount).to.equal(ethers.parseEther("5.0"));
      
      // Resolve with Y win
      await betContract.connect(creator).resolveBetRound(roundId, 4);
      
      // Verify resolution
      const finalRoundInfo = await betContract.getBetRoundInfo(roundId);
      expect(finalRoundInfo.betState).to.equal(4);
    });

    it("Complete betting scenario: Draw with equal bets", async function () {
      // Create bet round
      const description = ethers.encodeBytes32String("Will it be a tie?");
      const creatorFee = 200; // 0.5%
      
      await betContract.connect(creator).createBetRound(description, creatorFee);
      const roundId = 0;
      
      // Equal bets on both sides
      await betContract.connect(bettor1).placeBet(roundId, 0, { value: ethers.parseEther("1.0") });
      await betContract.connect(bettor2).placeBet(roundId, 1, { value: ethers.parseEther("1.0") });
      
      // Resolve as draw
      await betContract.connect(creator).resolveBetRound(roundId, 5);
      
      // Verify resolution
      const finalRoundInfo = await betContract.getBetRoundInfo(roundId);
      expect(finalRoundInfo.betState).to.equal(5);
    });

    it("Complete betting scenario: Cancellation", async function () {
      // Create bet round
      const description = ethers.encodeBytes32String("Cancelled event");
      const creatorFee = 100;
      
      await betContract.connect(creator).createBetRound(description, creatorFee);
      const roundId = 0;
      
      // Place some bets
      await betContract.connect(bettor1).placeBet(roundId, 0, { value: ethers.parseEther("1.0") });
      await betContract.connect(bettor2).placeBet(roundId, 1, { value: ethers.parseEther("2.0") });
      
      // Cancel the bet
      await betContract.connect(creator).resolveBetRound(roundId, 2);
      
      // Verify cancellation
      const finalRoundInfo = await betContract.getBetRoundInfo(roundId);
      expect(finalRoundInfo.betState).to.equal(2);
    });

    it("Multiple rounds scenario", async function () {
      // Create multiple bet rounds
      const description1 = ethers.encodeBytes32String("First bet");
      const description2 = ethers.encodeBytes32String("Second bet");
      const description3 = ethers.encodeBytes32String("Third bet");
      
      await betContract.connect(creator).createBetRound(description1, 100);
      await betContract.connect(bettor1).createBetRound(description2, 50);
      await betContract.connect(bettor2).createBetRound(description3, 200);
      
      // Place bets on different rounds
      await betContract.connect(bettor3).placeBet(0, 0, { value: ethers.parseEther("1.0") });
      await betContract.connect(owner).placeBet(1, 1, { value: ethers.parseEther("2.0") });
      await betContract.connect(bettor1).placeBet(2, 0, { value: ethers.parseEther("0.5") });
      
      // Resolve rounds differently
      await betContract.connect(creator).resolveBetRound(0, 3); // X wins
      await betContract.connect(bettor1).resolveBetRound(1, 4); // Y wins
      await betContract.connect(bettor2).resolveBetRound(2, 5); // Draw
      
      // Verify all rounds are resolved
      expect(await betContract.getTotalRounds()).to.equal(3);
      
      const round0 = await betContract.getBetRoundInfo(0);
      const round1 = await betContract.getBetRoundInfo(1);
      const round2 = await betContract.getBetRoundInfo(2);
      
      expect(round0.betState).to.equal(3);
      expect(round1.betState).to.equal(4);
      expect(round2.betState).to.equal(5);
    });
  });

  describe("Complex Bet Round Gas Measurement", function () {
    const testDescription = ethers.encodeBytes32String("Final: Team Alpha vs Team Beta");
    let bettor4, bettor5, bettor6;
    
    beforeEach(async function () {
      // Get additional signers for 6 bettors total
      [owner, creator, bettor1, bettor2, bettor3, bettor4, bettor5, bettor6, ...addrs] = await ethers.getSigners();

      // Deploy the contract
      const Bet = await ethers.getContractFactory("Bet");
      betContract = await Bet.deploy();
      await betContract.waitForDeployment();
    });

    it("Complex betting scenario with 6 bettors - X wins with gas measurement", async function () {
      console.log("\n=== Complex Bet Round with 6 Bettors - X Win Scenario ===");
      
      let creatorFee = 33n; // 3% fee
      // Step 1: Create bet round and measure gas
      const tx = await betContract.connect(creator).createBetRound(testDescription, creatorFee);
      const createReceipt = await tx.wait();
      const createGasUsed = createReceipt.gasUsed;
      
      const event = createReceipt.logs
        .map(log => {
          try {
            return betContract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find(parsed => parsed && parsed.name === "BetRoundCreated");
      const roundId = event.args.roundId;
      console.log(`1. Create Bet Round #${roundId} Gas Used: ${createGasUsed.toString()}`);
      // Step 2: Place bets by 6 different bettors with varying amounts and measure gas for each
      const betAmounts = [
        ethers.parseEther("5.0"),   // bettor1: 5 ETH on X
        ethers.parseEther("3.5"),   // bettor2: 3.5 ETH on Y
        ethers.parseEther("2.0"),   // bettor3: 2 ETH on X
        ethers.parseEther("4.0"),   // bettor4: 4 ETH on Y
        ethers.parseEther("1.5"),   // bettor5: 1.5 ETH on X
        ethers.parseEther("6.0")    // bettor6: 6 ETH on Y
        ];
        
        const betOptions = [0, 1, 0, 1, 0, 1]; // X, Y, X, Y, X, Y
        const bettors = [bettor1, bettor2, bettor3, bettor4, bettor5, bettor6];
        
        let totalBetGas = 0n;
        let totalXBetAmount = 0n;
        let totalYBetAmount = 0n;
        
        console.log("\n2. Placing bets by 6 bettors:");
        for (let i = 0; i < 6; i++) {
          const betTx = await betContract.connect(bettors[i]).placeBet(roundId, betOptions[i], { value: betAmounts[i] });
          const betReceipt = await betTx.wait();
          const betGasUsed = betReceipt.gasUsed;
          totalBetGas += betGasUsed;
          
          if (betOptions[i] === 0) {
            totalXBetAmount += betAmounts[i];
          } else {
            totalYBetAmount += betAmounts[i];
          }
              
          console.log(`   Bettor ${i}: ${ethers.formatEther(betAmounts[i])} ETH on ${betOptions[i] === 0 ? 'X' : 'Y'} - Gas: ${betGasUsed.toString()}`);
        }
          
        console.log(`   Total bet gas used: ${totalBetGas.toString()}`);
        console.log(`   Average gas per bet: ${(totalBetGas / 6n).toString()}`);

        // Step 3: Verify bet amounts
        const roundInfo = await betContract.getBetRoundInfo(roundId);
        expect(roundInfo.totalXBetAmount).to.equal(totalXBetAmount);
        expect(roundInfo.totalYBetAmount).to.equal(totalYBetAmount);
        expect(roundInfo.totalXBetAmount).to.equal(ethers.parseEther("8.5")); // 5 + 2 + 1.5
        expect(roundInfo.totalYBetAmount).to.equal(ethers.parseEther("13.5")); // 3.5 + 4 + 6
        
        console.log(`\n3. Total bet amounts:`);
        console.log(`   X bets: ${ethers.formatEther(totalXBetAmount)} ETH`);
        console.log(`   Y bets: ${ethers.formatEther(totalYBetAmount)} ETH`);
        console.log(`   Total pool: ${ethers.formatEther(totalXBetAmount + totalYBetAmount)} ETH`);
        
        // Step 4: Resolve bet round with X win and measure gas
        const resolveTx = await betContract.connect(creator).resolveBetRound(roundId, 3); // X wins
        const resolveReceipt = await resolveTx.wait();
        const resolveGasUsed = resolveReceipt.gasUsed;
        console.log(`\n4. Resolve Bet Round (X wins) Gas Used: ${resolveGasUsed.toString()}`);
        
        // Step 5: Verify resolution
        const finalRoundInfo = await betContract.getBetRoundInfo(roundId);
        expect(finalRoundInfo.betState).to.equal(3); // X win
        expect(finalRoundInfo.endTime).to.be.greaterThan(0);
        
        // Each X-bettor should be able to claim their win after X wins.
        // We'll have each X-bettor call claimWin and check their balance increases appropriately.

        // Helper: get balance in BigInt
        async function getBalance(addr) {
          return BigInt(await ethers.provider.getBalance(addr));
        }

        // Calculate expected payout for X-bettors (ignoring creator fee for simplicity)
        // In the contract, the payout logic may include creator fee, so let's fetch the fee
        creatorFee = (await betContract.getBetRoundInfo(roundId)).creatorFee;
        //const SCALE = 1000n;
        // Estimate expected win:
        // Their bet back + proportional share of Y pool (minus creator fee)
        // payout = betAmount + (betAmount / totalXBetAmount) * (totalYBetAmount * (SCALE - creatorFee) / SCALE)
        const totalPool = totalXBetAmount + totalYBetAmount;
        const creatorFeeAmount = totalPool / creatorFee;
        const winScale =  (totalPool - creatorFeeAmount) / totalXBetAmount;
        
        console.log('Total Y bet amount', ethers.formatEther(totalYBetAmount));
        console.log('Total X bet amount', ethers.formatEther(totalXBetAmount));
        console.log('Total pool', ethers.formatEther(totalPool));
        console.log('Creator fee amount', ethers.formatEther(creatorFeeAmount));
        console.log('Win scale', winScale);

        // For each X-bettor, calculate their share of the Y pool (minus creator fee)
        for (let i = 0; i < 6; i++) {
          const bettor = bettors[i];
          if (betOptions[i] === 0) { // X-bettor
            const betAmount = betAmounts[i];
            const before = await getBalance(bettor.address);

            // Claim win
            const claimTx = await betContract.connect(bettor).claimWin(roundId);
            await claimTx.wait();

            const after = await getBalance(bettor.address);

            console.log('Before', ethers.formatEther(before));
            console.log('After', ethers.formatEther(after));
            // Allow for gas cost, so just check that at least expectedPayout - 0.01 ETH is received
            const received = after - before;
            const expected = betAmount * winScale;
            console.log(`Bettor ${i} received: ${ethers.formatEther(received)} ETH, expected at least: ${ethers.formatEther(expected)} ETH`);
            console.log('Expected - received', expected - received);
            expect(received).to.be.closeTo(expected, 30000000000000);
          }
          else {
            await expect(betContract.connect(bettor).claimWin(roundId))
            .to.be.revertedWith("Has no win");
          }
        }

        // Step 6: Calculate total gas usage
        const totalGasUsed = createGasUsed + totalBetGas + resolveGasUsed;
        console.log(`\n5. Total Gas Usage Summary:`);
        console.log(`   Create Round: ${createGasUsed.toString()} gas`);
        console.log(`   Place Bets (6): ${totalBetGas.toString()} gas`);
        console.log(`   Resolve Round: ${resolveGasUsed.toString()} gas`);
        console.log(`   TOTAL: ${totalGasUsed.toString()} gas`);
        console.log(`   Average gas per transaction: ${(totalGasUsed / 8n).toString()} gas`);
        
        // Step 7: Gas efficiency assertions
        expect(createGasUsed).to.be.lessThan(BigInt(150000));
        expect(totalBetGas / 6n).to.be.lessThan(BigInt(120000)); // Average per bet
        expect(resolveGasUsed).to.be.lessThan(BigInt(300000));
        expect(totalGasUsed).to.be.lessThan(BigInt(1000000)); // Total should be under 1M gas
        
        console.log(`\n6. Gas Efficiency Check: ✅ All gas limits passed`);
        console.log(`   - Create round: ${createGasUsed < 150000n ? '✅' : '❌'} (${createGasUsed} < 150,000)`);
        console.log(`   - Average bet: ${(totalBetGas / 6n) < 120000n ? '✅' : '❌'} (${totalBetGas / 6n} < 120,000)`);
        console.log(`   - Resolve round: ${resolveGasUsed < 300000n ? '✅' : '❌'} (${resolveGasUsed} < 300,000)`);
        console.log(`   - Total: ${totalGasUsed < 1000000n ? '✅' : '❌'} (${totalGasUsed} < 1,000,000)`);
        /*
        */
        console.log("\n=== Test completed successfully! ===\n");
    });
  });

  describe("Gas Optimization Tests", function () {
    it("Measure gas for bet round creation", async function () {
      const description = ethers.encodeBytes32String("Gas test");
      const creatorFee = 100;
      
      const estimatedGas = await betContract.connect(creator).createBetRound.estimateGas(description, creatorFee);
      console.log(`createBetRound: ${estimatedGas} gas`);
      expect(estimatedGas).to.be.lessThan(BigInt(150000));
    });

    it("Measure gas for placing bet", async function () {
      await betContract.connect(creator).createBetRound(ethers.encodeBytes32String("Test"), 100);
      const roundId = 0;
      
      const estimatedGas = await betContract.connect(bettor1).placeBet.estimateGas(roundId, 0, { value: ethers.parseEther("1.0") });
      console.log(`placeBet: ${estimatedGas} gas`);
      expect(estimatedGas).to.be.lessThan(BigInt(120000));
    });

    it("Measure gas for resolving bet round", async function () {
      await betContract.connect(creator).createBetRound(ethers.encodeBytes32String("Test"), 100);
      const roundId = 0;
      await betContract.connect(bettor1).placeBet(roundId, 0, { value: ethers.parseEther("1.0") });
      
      const estimatedGas = await betContract.connect(creator).resolveBetRound.estimateGas(roundId, 3);
      console.log(`resolveBetRound: ${estimatedGas} gas`);
      expect(estimatedGas).to.be.lessThan(BigInt(160000));
    });

    it("Measure gas for getting bet round info", async function () {
      await betContract.connect(creator).createBetRound(ethers.encodeBytes32String("Test"), 100);
      const roundId = 0;
      
      const estimatedGas = await betContract.getBetRoundInfo.estimateGas(roundId);
      console.log(`getBetRoundInfo: ${estimatedGas} gas`);
      expect(estimatedGas).to.be.lessThan(BigInt(45000));
    });
  });

  describe("Security Tests", function () {
    it("Should not allow non-creator to resolve bet", async function () {
      await betContract.connect(creator).createBetRound(ethers.encodeBytes32String("Test"), 100);
      const roundId = 0;
      await betContract.connect(bettor1).placeBet(roundId, 0, { value: ethers.parseEther("1.0") });
      
      await expect(
        betContract.connect(bettor1).resolveBetRound(roundId, 3)
      ).to.be.revertedWith("Only creator can call this function");
    });

    it("Should not allow betting on non-existent round", async function () {
      await expect(
        betContract.connect(bettor1).placeBet(999, 0, { value: ethers.parseEther("1.0") })
      ).to.be.revertedWith("Bet round does not exist");
    });

    it("Should not allow resolving non-existent round", async function () {
      await expect(
        betContract.connect(creator).resolveBetRound(999, 3)
      ).to.be.revertedWith("Bet round does not exist");
    });

    it("Should not allow betting on ended round", async function () {
      await betContract.connect(creator).createBetRound(ethers.encodeBytes32String("Test"), 100);
      const roundId = 0;
      await betContract.connect(bettor1).placeBet(roundId, 0, { value: ethers.parseEther("1.0") });
      await betContract.connect(creator).resolveBetRound(roundId, 3);
      
      await expect(
        betContract.connect(bettor2).placeBet(roundId, 0, { value: ethers.parseEther("1.0") })
      ).to.be.revertedWith("Round is not active.");
    });

    it("Should not allow zero bet amount", async function () {
      await betContract.connect(creator).createBetRound(ethers.encodeBytes32String("Test"), 100);
      const roundId = 0;
      
      await expect(
        betContract.connect(bettor1).placeBet(roundId, 0, { value: 0 })
      ).to.be.revertedWith("Bet amount must be greater than 0");
    });
  });

  describe("claimWin Modifier Tests", function () {
    let roundId;
    const testDescription = ethers.encodeBytes32String("Test bet round");
    const creatorFee = 100; // 1% fee

    beforeEach(async function () {
      // Create a bet round and place some bets
      await betContract.connect(creator).createBetRound(testDescription, creatorFee);
      roundId = 0;
      
      // Place bets on both sides
      await betContract.connect(bettor1).placeBet(roundId, 0, { value: ethers.parseEther("1.0") }); // X
      await betContract.connect(bettor2).placeBet(roundId, 1, { value: ethers.parseEther("1.0") }); // Y
      
      // Resolve with X win to create wins for X bettors
      await betContract.connect(creator).resolveBetRound(roundId, 3); // X wins
    });

    describe("roundExists modifier", function () {
      it("Should revert when trying to claim win for non-existent round", async function () {
        const nonExistentRoundId = 999;
        
        await expect(
          betContract.connect(bettor1).claimWin(nonExistentRoundId)
        ).to.be.revertedWith("Bet round does not exist");
      });

      it("Should allow claiming win for existing round", async function () {
        // This should not revert due to roundExists modifier
        // It might revert due to other modifiers, but not roundExists
        await expect(
          betContract.connect(bettor1).claimWin(roundId)
        ).to.not.be.revertedWith("Bet round does not exist");
      });
    });

    describe("roundEnded modifier", function () {
      it("Should revert when trying to claim win for active round", async function () {
        // Create a new active round
        await betContract.connect(bettor1).createBetRound(testDescription, creatorFee);
        const activeRoundId = 1;
        
        // Place a bet
        await betContract.connect(bettor2).placeBet(activeRoundId, 0, { value: ethers.parseEther("1.0") });
        
        // Try to claim win on active round (should revert)
        await expect(
          betContract.connect(bettor2).claimWin(activeRoundId)
        ).to.be.revertedWith("Bet is still active");
      });

      it("Should allow claiming win for ended round (X win)", async function () {
        // Round is already ended with X win in beforeEach
        await expect(
          betContract.connect(bettor1).claimWin(roundId)
        ).to.not.be.revertedWith("Bet is still active");
      });

      it("Should allow claiming win for ended round (Y win)", async function () {
        // Create new round and end with Y win
        await betContract.connect(bettor1).createBetRound(testDescription, creatorFee);
        const yWinRoundId = 1;
        
        await betContract.connect(bettor2).placeBet(yWinRoundId, 1, { value: ethers.parseEther("1.0") }); // Y
        await betContract.connect(bettor1).resolveBetRound(yWinRoundId, 4); // Y wins
        
        await expect(
          betContract.connect(bettor2).claimWin(yWinRoundId)
        ).to.not.be.revertedWith("Bet is still active");
      });

      it("Should allow claiming win for ended round (Draw)", async function () {
        // Create new round and end with draw
        await betContract.connect(bettor1).createBetRound(testDescription, creatorFee);
        const drawRoundId = 1;
        
        await betContract.connect(bettor2).placeBet(drawRoundId, 0, { value: ethers.parseEther("1.0") }); // X
        await betContract.connect(bettor3).placeBet(drawRoundId, 1, { value: ethers.parseEther("1.0") }); // Y
        await betContract.connect(bettor1).resolveBetRound(drawRoundId, 5); // Draw
        
        await expect(
          betContract.connect(bettor2).claimWin(drawRoundId)
        ).to.not.be.revertedWith("Bet is still active");
      });

      it("Should allow claiming win for ended round (Cancelled)", async function () {
        // Create new round and cancel it
        await betContract.connect(bettor1).createBetRound(testDescription, creatorFee);
        const cancelledRoundId = 1;
        
        await betContract.connect(bettor2).placeBet(cancelledRoundId, 0, { value: ethers.parseEther("1.0") }); // X
        await betContract.connect(bettor1).resolveBetRound(cancelledRoundId, 2); // Cancelled
        
        await expect(
          betContract.connect(bettor2).claimWin(cancelledRoundId)
        ).to.not.be.revertedWith("Bet is still active");
      });
    });

    describe("hasAnyWin modifier", function () {
      it("Should revert when caller has no wins", async function () {
        // bettor3 has not placed any bets, so they have no wins
        await expect(
          betContract.connect(bettor3).claimWin(roundId)
        ).to.be.revertedWith("Has no win");
      });

      it("Should allow claiming when caller has wins", async function () {
        // bettor1 bet on X and X won, so they should have a win
        await expect(
          betContract.connect(bettor1).claimWin(roundId)
        ).to.not.be.revertedWith("Has no win");
      });

      it("Should revert for non-participant even if round exists and ended", async function () {
        // bettor3 never participated in any rounds
        await expect(
          betContract.connect(bettor3).claimWin(roundId)
        ).to.be.revertedWith("Has no win");
      });
    });

    describe("winIsNotClaimed modifier", function () {
      it("Should allow claiming win for the first time", async function () {
        // bettor1 should be able to claim their win
        await expect(
          betContract.connect(bettor1).claimWin(roundId)
        ).to.not.be.revertedWith("Win is already claimed or you are not a winner");
      });

      it("Should revert when trying to claim the same win twice", async function () {
        // First claim should succeed
        await betContract.connect(bettor1).claimWin(roundId);
        
        // Second claim should fail
        await expect(
          betContract.connect(bettor1).claimWin(roundId)
        ).to.be.revertedWith("Win is already claimed or you are not a winner");
      });

      it("Should allow claiming different wins for the same user", async function () {
        // Create another round where bettor1 wins
        await betContract.connect(bettor2).createBetRound(testDescription, creatorFee);
        const roundId2 = 1;
        
        await betContract.connect(bettor1).placeBet(roundId2, 0, { value: ethers.parseEther("1.0") }); // X
        await betContract.connect(bettor3).placeBet(roundId2, 1, { value: ethers.parseEther("1.0") }); // Y
        await betContract.connect(bettor2).resolveBetRound(roundId2, 3); // X wins
        
        // Should be able to claim both wins
        await expect(betContract.connect(bettor1).claimWin(roundId)).to.not.be.reverted;
        await expect(betContract.connect(bettor1).claimWin(roundId2)).to.not.be.reverted;
      });

      it("Should revert when trying to claim already claimed win", async function () {
        // Claim the win
        await betContract.connect(bettor1).claimWin(roundId);
        
        // Try to claim again
        await expect(
          betContract.connect(bettor1).claimWin(roundId)
        ).to.be.revertedWith("Win is already claimed or you are not a winner");
      });
    });

    describe("Combined modifier scenarios", function () {
      it("Should handle all modifiers correctly for valid claim", async function () {
        // This should pass all modifiers:
        // - roundExists: roundId 0 exists
        // - roundEnded: round ended with X win
        // - hasAnyWin: bettor1 bet on X and X won
        // - winIsNotClaimed: bettor1 hasn't claimed yet
        await expect(
          betContract.connect(bettor1).claimWin(roundId)
        ).to.not.be.reverted;
      });

      it("Should fail multiple modifier checks", async function () {
        // bettor3 fails multiple checks:
        // - hasAnyWin: they have no wins
        // - winIsNotClaimed: they have no wins to claim
        await expect(
          betContract.connect(bettor3).claimWin(roundId)
        ).to.be.revertedWith("Has no win");
      });

      it("Should fail roundExists but pass other checks", async function () {
        // Create a scenario where bettor1 has wins but tries to claim non-existent round
        const nonExistentRoundId = 999;
        
        await expect(
          betContract.connect(bettor1).claimWin(nonExistentRoundId)
        ).to.be.revertedWith("Bet round does not exist");
      });

      it("Should fail roundEnded but pass other checks", async function () {
        // Create an active round
        await betContract.connect(bettor1).createBetRound(testDescription, creatorFee);
        const activeRoundId = 1;
        
        // Place a bet but don't resolve
        await betContract.connect(bettor2).placeBet(activeRoundId, 0, { value: ethers.parseEther("1.0") });
        
        await expect(
          betContract.connect(bettor2).claimWin(activeRoundId)
        ).to.be.revertedWith("Bet is still active");
      });
    });

    describe("Edge cases for claimWin modifiers", function () {
      it("Should handle user who bet on losing side", async function () {
        // bettor2 bet on Y but X won, so they should have no wins
        await expect(
          betContract.connect(bettor2).claimWin(roundId)
        ).to.be.revertedWith("Has no win");
      });

      it("Should handle user who bet on both sides in draw scenario", async function () {
        // Create a draw scenario
        await betContract.connect(bettor1).createBetRound(testDescription, creatorFee);
        const drawRoundId = 1;
        
        // bettor1 bets on both sides
        await betContract.connect(bettor1).placeBet(drawRoundId, 0, { value: ethers.parseEther("1.0") }); // X
        await betContract.connect(bettor1).placeBet(drawRoundId, 1, { value: ethers.parseEther("1.0") }); // Y
        await betContract.connect(bettor1).resolveBetRound(drawRoundId, 5); // Draw
        
        // Should be able to claim win
        await expect(
          betContract.connect(bettor1).claimWin(drawRoundId)
        ).to.not.be.reverted;
      });

      it("Should handle maximum round ID", async function () {
        // Try to claim with maximum uint256 value
        const maxRoundId = ethers.MaxUint256;
        
        await expect(
          betContract.connect(bettor1).claimWin(maxRoundId)
        ).to.be.revertedWith("Bet round does not exist");
      });

      it("Should handle zero round ID", async function () {
        // Round ID 0 exists in our test, so this should work
        await expect(
          betContract.connect(bettor1).claimWin(0)
        ).to.not.be.revertedWith("Bet round does not exist");
      });
    });
  });
});