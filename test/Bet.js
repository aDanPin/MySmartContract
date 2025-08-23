const { expect } = require("chai");
const { ethers } = require("hardhat");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

describe("Bet Contract E2E Test", function () {
  let Bet;
  let bet;
  let creator;
  let bettor1;
  let bettor2;
  let bettor3;
  let bettor4;
  let bettor5;
  let addrs;

  beforeEach(async function () {
    Bet = await ethers.getContractFactory("Bet");
    bet = await Bet.deploy();
    await bet.waitForDeployment();

    [creator, bettor1, bettor2, bettor3, bettor4, bettor5, ...addrs] = await ethers.getSigners();
  });

  describe("Complete E2E Flow: Bet Creation to Win Claiming", function () {
    it("Should complete full betting cycle from creation to win claiming", async function () {
      // Step 1: Create a betting round
      let roundId; // First round
      let roundDescription;
      
      const waitForRoundCreated = new Promise(resolve => {
          bet.on("BetRoundCreated", (id, desc) => {
            console.log(`📩 BetRoundCreated: ${id}, ${desc}`);
            roundId = id;
            roundDescription = desc;

            resolve("Round created");
          });
          setTimeout(() => {
            resolve(new Error("Timeout waiting for event BetRoundCreated"));
          }, 1000);
      });
      
      const description = ethers.keccak256(ethers.encodeBytes32String("X or Y?"));
      const creatorFee = 100; // 1% fee
      const createTx = await bet.connect(creator).createBetRound(description, creatorFee);

      await Promise.all([
        waitForRoundCreated
      ]);
      expect(roundId).to.equal(0);
      expect(roundDescription).to.equal(description);

      const createReceipt = await createTx.wait();

      // Measure gas used for bet round creation
      console.log(`⛽ Bet round creation gas used: ${createReceipt.gasUsed.toString()}`);
      // Calculate and print the actual ETH cost (gasUsed * gasPrice)
      const gasPrice = createReceipt.gasPrice || createReceipt.effectiveGasPrice;
      if (gasPrice) {
        console.log(`💸 Bet round creation cost: ${ethers.formatEther(createReceipt.gasUsed * BigInt(gasPrice))} ETH`);
      } else {
        console.log(`💸 Bet round creation cost: Unable to calculate (gas price not available)`);
      }
      
      const roundInfo = await bet.getBetRoundInfo(roundId);
      expect(roundInfo.description).to.equal(description);
      expect(roundInfo.creator).to.equal(creator.address);
      expect(roundInfo.creatorFee).to.equal(creatorFee);
      expect(roundInfo.betState).to.equal(1); // InProcess

      console.log("Bet round created successfully");
      // Step 2: Multiple users place bets
      const betAmount1 = ethers.parseEther("1.0");
      const betAmount2 = ethers.parseEther("2.0");
      const betAmount3 = ethers.parseEther("0.5");
      const betAmount4 = ethers.parseEther("1.5");
      const betAmount5 = ethers.parseEther("0.8");
      const betAmountCreator = ethers.parseEther("0.13");

      let bettorsX = [];
      let bettorsY = [];
      const bettors = [bettor1, bettor2, bettor3, bettor4, bettor5, creator];
      // Helper function to get bettor object from bettors array by address value
      function getBettorByAddress(address) {
        return bettors.find(b => b.address === address);
      }

      const waitForPlaceBet = new Promise(resolve => {
        bet.on("Betplaced", (id, xOrY, bettor, amount) => {
          console.log(`📩 Betplaced: ${id}, ${xOrY}, ${bettor}, ${ethers.formatEther(amount)}`);
          if (xOrY == 0) {
            bettorsX.push({ address: bettor, amount: amount });
          } else {
            bettorsY.push({ address: bettor, amount: amount });
          }

          if (bettorsX.length + bettorsY.length == 6) {
            resolve("Bet placed");
          }
        });
        setTimeout(() => {
          reject(new Error("Timeout waiting for event Betplaced"));
        }, 6000);
      });

      // Measure gas used for each placeBet
      const placeBetTx1 = await bet.connect(bettor1).placeBet(roundId, 0, { value: betAmount1 });
      const placeBetReceipt1 = await placeBetTx1.wait();
      console.log(`⛽ placeBet (bettor1, X) gas used: ${placeBetReceipt1.gasUsed.toString()}`);
      
      const placeBetTx2 = await bet.connect(bettor2).placeBet(roundId, 0, { value: betAmount2 });
      const placeBetReceipt2 = await placeBetTx2.wait();
      console.log(`⛽ placeBet (bettor2, X) gas used: ${placeBetReceipt2.gasUsed.toString()}`);
      
      const placeBetTx3 = await bet.connect(bettor3).placeBet(roundId, 0, { value: betAmount3 });
      const placeBetReceipt3 = await placeBetTx3.wait();
      console.log(`⛽ placeBet (bettor3, X) gas used: ${placeBetReceipt3.gasUsed.toString()}`);
      
      const placeBetTx4 = await bet.connect(bettor4).placeBet(roundId, 1, { value: betAmount4 });
      const placeBetReceipt4 = await placeBetTx4.wait();
      console.log(`⛽ placeBet (bettor4, Y) gas used: ${placeBetReceipt4.gasUsed.toString()}`);
      
      const placeBetTx5 = await bet.connect(bettor5).placeBet(roundId, 1, { value: betAmount5 });
      const placeBetReceipt5 = await placeBetTx5.wait();
      console.log(`⛽ placeBet (bettor5, Y) gas used: ${placeBetReceipt5.gasUsed.toString()}`);

      const placeBetTxCreator = await bet.connect(creator).placeBet(roundId, 1, { value: betAmountCreator });
      const placeBetReceiptCreator = await placeBetTxCreator.wait();
      console.log(`⛽ placeBet (creator, Y) gas used: ${placeBetReceiptCreator.gasUsed.toString()}`);
      
      await Promise.all([
        waitForPlaceBet,
        waitForPlaceBet,
        waitForPlaceBet,
        waitForPlaceBet,
        waitForPlaceBet,
        waitForPlaceBet
      ]);
      
      console.log(`💰 All bets has been placed`);

      // Verify bet amounts
      const updatedRoundInfo = await bet.getBetRoundInfo(roundId);
      expect(updatedRoundInfo.totalXBetAmount).to.equal(ethers.parseEther("3.5")); // 1 + 2 + 0.5
      expect(updatedRoundInfo.totalYBetAmount).to.equal(ethers.parseEther("2.43")); // 1.5 + 0.8 + 0.13
      // Step 3: Calculate potential winnings (X wins scenario)
      const totalXAmount = ethers.parseEther("3.5");
      const totalYAmount = ethers.parseEther("2.43");
      const totalPool = totalXAmount + totalYAmount;
      const creatorFeeAmount = totalPool / BigInt(creatorFee); // 1% of total pool
      const winningPool = totalPool - creatorFeeAmount;
      console.log(`💰 Total pool: ${ethers.formatEther(totalPool)} ETH`);
      console.log(`💰 Creator fee: ${ethers.formatEther(creatorFeeAmount)} ETH`);
      console.log(`💰 Winning pool: ${ethers.formatEther(winningPool)} ETH`);

      // Calculate individual winnings for X bettors
      bettorsX[0].winAmount = (winningPool  * bettorsX[0].amount / totalXAmount);
      bettorsX[1].winAmount = (winningPool  * bettorsX[1].amount / totalXAmount);
      bettorsX[2].winAmount = (winningPool  * bettorsX[2].amount / totalXAmount);
      
      console.log("💰 Calculated winnings:");
      console.log(`  Bettor1: ${ethers.formatEther(bettorsX[0].winAmount)} ETH`);
      console.log(`  Bettor2: ${ethers.formatEther(bettorsX[1].winAmount)} ETH`);
      console.log(`  Bettor3: ${ethers.formatEther(bettorsX[2].winAmount)} ETH`);

      const leaves = bettorsX.map(x =>
        Buffer.from(
          ethers.solidityPackedKeccak256(["address", "uint256"], [x.address, x.amount]).slice(2),
          "hex"
        )
      );
      
      const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
      
      const root = merkleTree.getHexRoot();
      
      // Step 7: Resolve the bet round (X wins)
      const resolveTx = await bet.connect(creator).resolveBetRound(roundId, 3, root); // 3 = win X
      await resolveTx.wait();
      console.log("Merkle tree generated with root:", root);
      
      // Verify resolution
      const resolvedRoundInfo = await bet.getBetRoundInfo(roundId);
      expect(resolvedRoundInfo.betState).to.equal(3); // Win X
      expect(await bet.getMerkleRoot(roundId)).to.equal(root);
      
      console.log("Bet round resolved - X wins");
      
      // Step 8: Winners claim their winnings
      const initialBalance1 = await ethers.provider.getBalance(bettorsX[0].address);
      const initialBalance2 = await ethers.provider.getBalance(bettorsX[1].address);
      const initialBalance3 = await ethers.provider.getBalance(bettorsX[2].address);

      // Claim winnings with correct Merkle proofs
      const leaf1 = Buffer.from(
        ethers.solidityPackedKeccak256(["address", "uint256"], [ bettorsX[0].address, bettorsX[0].amount]).slice(2),
        "hex"
      );
      const leaf2 = Buffer.from(
        ethers.solidityPackedKeccak256(["address", "uint256"], [bettorsX[1].address, bettorsX[1].amount]).slice(2),
        "hex"
      );
      const leaf3 = Buffer.from(
        ethers.solidityPackedKeccak256(["address", "uint256"], [bettorsX[2].address, bettorsX[2].amount]).slice(2),
        "hex"
      );
      const proof1 = merkleTree.getHexProof(leaf1);
      const proof2 = merkleTree.getHexProof(leaf2);
      const proof3 = merkleTree.getHexProof(leaf3);

      let claimedWins = 0;
      const waitForClaimWin = new Promise(resolve => {
        bet.on("WinClaimed", (id, bettor, amount) => {
          console.log(`📩 WinClaimed: ${id}, ${bettor}, ${ethers.formatEther(amount)}`);
          claimedWins++;
          if (claimedWins == 3) {
            resolve("Win claimed");
          }
        });
        setTimeout(() => {
          reject(new Error("Timeout waiting for event WinClaimed"));
        }, 6000);
      });

      // Measure gas for each claimWin call
      const tx1 = await bet.connect(getBettorByAddress(bettorsX[0].address)).claimWin(roundId, bettorsX[0].amount, proof1);
      const receipt1 = await tx1.wait();
      console.log(`⛽ Gas used for claimWin (bettor 1): ${receipt1.gasUsed.toString()}`);

      const tx2 = await bet.connect(getBettorByAddress(bettorsX[1].address)).claimWin(roundId, bettorsX[1].amount, proof2);
      const receipt2 = await tx2.wait();
      console.log(`⛽ Gas used for claimWin (bettor 2): ${receipt2.gasUsed.toString()}`);

      const tx3 = await bet.connect(getBettorByAddress(bettorsX[2].address)).claimWin(roundId, bettorsX[2].amount, proof3);
      const receipt3 = await tx3.wait();
      console.log(`⛽ Gas used for claimWin (bettor 3): ${receipt3.gasUsed.toString()}`);
      
      await Promise.all([
        waitForClaimWin,
        waitForClaimWin,
        waitForClaimWin
      ]);
      
      // Verify balances increased
      const finalBalance1 = await ethers.provider.getBalance(bettorsX[0].address);
      const finalBalance2 = await ethers.provider.getBalance(bettorsX[1].address);
      const finalBalance3 = await ethers.provider.getBalance(bettorsX[2].address);

      expect(finalBalance1 - initialBalance1).to.be.closeTo(bettorsX[0].winAmount, 3 * (10 ** 13));
      expect(finalBalance2 - initialBalance2).to.be.closeTo(bettorsX[1].winAmount, 3 * (10 ** 13));
      expect(finalBalance3 - initialBalance3).to.be.closeTo(bettorsX[2].winAmount, 3 * (10 ** 13));
      
      console.log("All winners claimed their winnings successfully");
      
      // Step 9: Verify claimed status
      expect(await bet.hasClaimedWin(roundId, bettorsX[0].address)).to.be.true;
      expect(await bet.hasClaimedWin(roundId, bettorsX[1].address)).to.be.true;
      expect(await bet.hasClaimedWin(roundId, bettorsX[2].address)).to.be.true;
      
      // Second win claiming check
      // Try to claim win again for bettor 2 (should fail)
      await expect(
        bet.connect(getBettorByAddress(bettorsX[1].address)).claimWin(roundId, bettorsX[1].amount, proof2)
      ).to.be.revertedWithCustomError(bet, "WinAlreadyClaimed");

      
      // Step 10: Verify Y bettors cannot claim (they didn't win)
      // Create a fake proof for a Y bettor
      const fakeLeaf = Buffer.from(
        ethers.solidityPackedKeccak256(["address", "uint256"], [bettor4.address, ethers.parseEther("1.0")]).slice(2),
        "hex"
      );
      const fakeProof = merkleTree.getHexProof(fakeLeaf);
      
      await expect(
        bet.connect(bettor4).claimWin(roundId, ethers.parseEther("1.0"), fakeProof)
      ).to.be.revertedWithCustomError(bet, "InvalidMerkleProof");
          
      // Step 11: Verify double claiming is prevented
      await expect(
        bet.connect(getBettorByAddress(bettorsX[0].address)).claimWin(roundId, bettorsX[0].amount, proof1)
      ).to.be.revertedWithCustomError(bet, "WinAlreadyClaimed");
            
      console.log("Double claiming prevention verified");
            
      // Step 12: Verify creator fee was collected
      const creatorBalance = await ethers.provider.getBalance(creator.address);
      console.log(`Creator balance: ${ethers.formatEther(creatorBalance)} ETH`);
            
      // Step 13: Final verification - check contract state
      const totalRounds = await bet.getTotalRounds();
      expect(totalRounds).to.equal(1);
            
      console.log("E2E test completed successfully!");
    });
  });
});

