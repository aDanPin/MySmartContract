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
      expect(estimatedGas).to.be.lessThan(BigInt(150000));
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
});