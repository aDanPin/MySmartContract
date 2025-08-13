const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CharacterSheet", function () {
  let characterSheet;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  beforeEach(async function () {
    // Get signers
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    // Deploy the contract
    const CharacterSheet = await ethers.getContractFactory("CharacterSheet");
    characterSheet = await CharacterSheet.deploy();
    await characterSheet.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right constants", async function () {
      expect(await characterSheet.MIN_ABILITY_SCORE()).to.equal(3);
      expect(await characterSheet.MAX_ABILITY_SCORE()).to.equal(18);
      expect(await characterSheet.MAX_LEVEL()).to.equal(20);
    });
  });

  describe("Character Creation", function () {
    const validCharacter = {
      name: ethers.encodeBytes32String("Gandalf"),
      raceClass: 1 // HumanMagicUser
    };

    const validAbilityScores = {
      timestamp: 0, // Will be set by contract
      level: 1,
      str: 10,
      dex: 12,
      con: 14,
      intell: 16,
      wis: 15,
      cha: 13
    };

    it("Should create a character successfully", async function () {
      await expect(characterSheet.connect(addr1).createCharacter(validCharacter, validAbilityScores))
        .to.not.be.reverted;

      const [character, scores] = await characterSheet.connect(addr1).getCharacter();
      expect(character.name).to.equal(validCharacter.name);
      expect(character.raceClass).to.equal(validCharacter.raceClass);
      expect(scores.level).to.equal(validAbilityScores.level);
      expect(scores.str).to.equal(validAbilityScores.str);
    });

    it("Should not allow creating a character twice", async function () {
      await characterSheet.connect(addr1).createCharacter(validCharacter, validAbilityScores);
      
      await expect(
        characterSheet.connect(addr1).createCharacter(validCharacter, validAbilityScores)
      ).to.be.revertedWith("Character already exists");
    });

    it("Should reject empty character name", async function () {
      const character = {
        name: ethers.encodeBytes32String(""),
        raceClass: 0
      };

      const validAbilityScores = {
        timestamp: 0,
        level: 1,
        str: 10,
        dex: 10,
        con: 10,
        intell: 10,
        wis: 10,
        cha: 10
      };

      await expect(
        characterSheet.connect(addr1).createCharacter(character, validAbilityScores)
      ).to.be.revertedWith("Invalid name");
    });

    it("Should reject invalid ability scores - too low", async function () {
      const invalidScores = { ...validAbilityScores, str: 2 };
      
      await expect(
        characterSheet.connect(addr1).createCharacter(validCharacter, invalidScores)
      ).to.be.revertedWith("Invalid strength score");
    });

    it("Should reject invalid ability scores - too high", async function () {
      const invalidScores = { ...validAbilityScores, dex: 19 };
      
      await expect(
        characterSheet.connect(addr1).createCharacter(validCharacter, invalidScores)
      ).to.be.revertedWith("Invalid dexterity score");
    });

    it("Should reject invalid level - too low", async function () {
      const invalidScores = { ...validAbilityScores, level: 0 };
      
      await expect(
        characterSheet.connect(addr1).createCharacter(validCharacter, invalidScores)
      ).to.be.revertedWith("Invalid start level");
    });

    it("Should reject invalid level - too high", async function () {
      const invalidScores = { ...validAbilityScores, level: 21 };
      
      await expect(
        characterSheet.connect(addr1).createCharacter(validCharacter, invalidScores)
      ).to.be.revertedWith("Invalid start level");
    });

    it("Should allow different users to create characters", async function () {
      const character2 = {
        name: ethers.encodeBytes32String("Aragorn"),
        raceClass: 0 // HumanFighter
      };

      await characterSheet.connect(addr1).createCharacter(validCharacter, validAbilityScores);
      await characterSheet.connect(addr2).createCharacter(character2, validAbilityScores);

      const [char1, scores1] = await characterSheet.connect(addr1).getCharacter();
      const [char2, scores2] = await characterSheet.connect(addr2).getCharacter();

      expect(char1.name).to.equal(validCharacter.name);
      expect(char2.name).to.equal(character2.name);
    });
  });

  describe("Character Updates", function () {
    const validCharacter = {
      name: ethers.encodeBytes32String("Legolas"),
      raceClass: 8 // ElfFighter
    };

    const initialScores = {
      timestamp: 0,
      level: 1,
      str: 12,
      dex: 18,
      con: 14,
      intell: 13,
      wis: 12,
      cha: 15
    };

    const updatedScores = {
      timestamp: 0,
      level: 2,
      str: 13,
      dex: 18,
      con: 15,
      intell: 14,
      wis: 13,
      cha: 16
    };

    beforeEach(async function () {
      await characterSheet.connect(addr1).createCharacter(validCharacter, initialScores);
    });

    it("Should update character ability scores successfully", async function () {
      await expect(characterSheet.connect(addr1).addChangeCharacter(updatedScores))
        .to.not.be.reverted;

      const [character, scores] = await characterSheet.connect(addr1).getCharacter();
      expect(scores.level).to.equal(updatedScores.level);
      expect(scores.str).to.equal(updatedScores.str);
      expect(scores.dex).to.equal(updatedScores.dex);
    });

    it("Should maintain character history", async function () {
      await characterSheet.connect(addr1).addChangeCharacter(updatedScores);

      const history = await characterSheet.connect(addr1).getAbilityScoresHistory();
      expect(history.length).to.equal(2);
      expect(history[0].level).to.equal(initialScores.level);
      expect(history[1].level).to.equal(updatedScores.level);
    });

    it("Should not allow updates for non-existent character", async function () {
      await expect(
        characterSheet.connect(addr2).addChangeCharacter(updatedScores)
      ).to.be.revertedWith("Character does not exist");
    });

    it("Should reject invalid ability scores in updates", async function () {
      const invalidScores = { ...updatedScores, con: 2 };
      
      await expect(
        characterSheet.connect(addr1).addChangeCharacter(invalidScores)
      ).to.be.revertedWith("Invalid constitution score");
    });
  });

  describe("Character Retrieval", function () {
    const validCharacter = {
      name: ethers.encodeBytes32String("Gimli"),
      raceClass: 4 // DwarfFighter
    };

    const validAbilityScores = {
      timestamp: 0,
      level: 5,
      str: 18,
      dex: 10,
      con: 16,
      intell: 11,
      wis: 12,
      cha: 9
    };

    beforeEach(async function () {
      await characterSheet.connect(addr1).createCharacter(validCharacter, validAbilityScores);
    });

    it("Should retrieve character data correctly", async function () {
      const [character, scores] = await characterSheet.connect(addr1).getCharacter();
      
      expect(character.name).to.equal(validCharacter.name);
      expect(character.raceClass).to.equal(validCharacter.raceClass);
      expect(scores.level).to.equal(validAbilityScores.level);
      expect(scores.str).to.equal(validAbilityScores.str);
      expect(scores.dex).to.equal(validAbilityScores.dex);
      expect(scores.con).to.equal(validAbilityScores.con);
      expect(scores.intell).to.equal(validAbilityScores.intell);
      expect(scores.wis).to.equal(validAbilityScores.wis);
      expect(scores.cha).to.equal(validAbilityScores.cha);
    });

    it("Should not allow retrieval for non-existent character", async function () {
      await expect(
        characterSheet.connect(addr2).getCharacter()
      ).to.be.revertedWith("Character does not exist");
    });

    it("Should return correct history length", async function () {
      expect(await characterSheet.connect(addr1).getAbilityScoresHistoryLength()).to.equal(1);
      
      const updatedScores = { ...validAbilityScores, level: 6 };
      await characterSheet.connect(addr1).addChangeCharacter(updatedScores);
      
      expect(await characterSheet.connect(addr1).getAbilityScoresHistoryLength()).to.equal(2);
    });

    it("Should return complete ability scores history", async function () {
      const updatedScores = { ...validAbilityScores, level: 6 };
      await characterSheet.connect(addr1).addChangeCharacter(updatedScores);

      const history = await characterSheet.connect(addr1).getAbilityScoresHistory();
      expect(history.length).to.equal(2);
      expect(history[0].level).to.equal(5);
      expect(history[1].level).to.equal(6);
    });
  });

  describe("Character Deletion", function () {
    const validCharacter = {
      name: ethers.encodeBytes32String("Boromir"),
      raceClass: 0 // HumanFighter
    };

    const validAbilityScores = {
      timestamp: 0,
      level: 3,
      str: 16,
      dex: 12,
      con: 14,
      intell: 13,
      wis: 11,
      cha: 15
    };

    beforeEach(async function () {
      await characterSheet.connect(addr1).createCharacter(validCharacter, validAbilityScores);
    });

    it("Should delete character successfully", async function () {
      await expect(characterSheet.connect(addr1).deleteCharacter())
        .to.not.be.reverted;

      await expect(
        characterSheet.connect(addr1).getCharacter()
      ).to.be.revertedWith("Character does not exist");
    });

    it("Should allow recreation after deletion", async function () {
      await characterSheet.connect(addr1).deleteCharacter();
      
      await expect(
        characterSheet.connect(addr1).createCharacter(validCharacter, validAbilityScores)
      ).to.not.be.reverted;
    });

    it("Should not allow deletion of non-existent character", async function () {
      await expect(
        characterSheet.connect(addr2).deleteCharacter()
      ).to.be.revertedWith("Character does not exist");
    });
  });

  describe("Edge Cases", function () {
    it("Should handle minimum valid ability scores", async function () {
      const character = {
        name: ethers.encodeBytes32String("MinStats"),
        raceClass: 0
      };

      const minScores = {
        timestamp: 0,
        level: 1,
        str: 3,
        dex: 3,
        con: 3,
        intell: 3,
        wis: 3,
        cha: 3
      };

      await expect(
        characterSheet.connect(addr1).createCharacter(character, minScores)
      ).to.not.be.reverted;
    });

    it("Should handle maximum valid ability scores", async function () {
      const character = {
        name: ethers.encodeBytes32String("MaxStats"),
        raceClass: 0
      };

      const maxScores = {
        timestamp: 0,
        level: 20,
        str: 18,
        dex: 18,
        con: 18,
        intell: 18,
        wis: 18,
        cha: 18
      };

      await expect(
        characterSheet.connect(addr1).createCharacter(character, maxScores)
      ).to.not.be.reverted;
    });
  });

  describe("Character History Management", function () {
    const validCharacter = {
      name: ethers.encodeBytes32String("HistoryTest"),
      raceClass: 0
    };

    const baseScores = {
      timestamp: 0,
      level: 1,
      str: 10,
      dex: 10,
      con: 10,
      intell: 10,
      wis: 10,
      cha: 10
    };

    beforeEach(async function () {
      await characterSheet.connect(addr1).createCharacter(validCharacter, baseScores);
    });

    it("Should maintain multiple history entries", async function () {
      // Add multiple updates
      for (let i = 2; i <= 5; i++) {
        const updatedScores = { ...baseScores, level: i, str: 10 + i };
        await characterSheet.connect(addr1).addChangeCharacter(updatedScores);
      }

      const history = await characterSheet.connect(addr1).getAbilityScoresHistory();
      expect(history.length).to.equal(5);
      
      // Check that history is maintained in order
      for (let i = 0; i < 5; i++) {
        expect(history[i].level).to.equal(i + 1);
      }
    });

    it("Should return latest character data after multiple updates", async function () {
      const finalScores = { ...baseScores, level: 10, str: 18, dex: 16 };
      await characterSheet.connect(addr1).addChangeCharacter(finalScores);

      const [character, scores] = await characterSheet.connect(addr1).getCharacter();
      expect(scores.level).to.equal(10);
      expect(scores.str).to.equal(18);
      expect(scores.dex).to.equal(16);
    });
  });

  describe("Contract State Isolation", function () {
    it("Should isolate character data between different users", async function () {
      const character1 = {
        name: ethers.encodeBytes32String("User1"),
        raceClass: 0
      };

      const character2 = {
        name: ethers.encodeBytes32String("User2"),
        raceClass: 1
      };

      const scores1 = {
        timestamp: 0,
        level: 1,
        str: 15,
        dex: 12,
        con: 14,
        intell: 10,
        wis: 11,
        cha: 13
      };

      const scores2 = {
        timestamp: 0,
        level: 5,
        str: 10,
        dex: 16,
        con: 12,
        intell: 18,
        wis: 15,
        cha: 14
      };

      // Create characters for different users
      await characterSheet.connect(addr1).createCharacter(character1, scores1);
      await characterSheet.connect(addr2).createCharacter(character2, scores2);

      // Verify each user can only access their own character
      const [char1, scores1Retrieved] = await characterSheet.connect(addr1).getCharacter();
      const [char2, scores2Retrieved] = await characterSheet.connect(addr2).getCharacter();

      expect(char1.name).to.equal(character1.name);
      expect(char2.name).to.equal(character2.name);
      expect(scores1Retrieved.level).to.equal(1);
      expect(scores2Retrieved.level).to.equal(5);
    });
  });

  describe("Gas Measurement Tests", function () {
    const testCharacter = {
      name: ethers.encodeBytes32String("GasTestCharacter"),
      raceClass: 0
    };

    const testAbilityScores = {
      timestamp: 0,
      level: 1,
      str: 10,
      dex: 12,
      con: 14,
      intell: 16,
      wis: 15,
      cha: 13
    };

    const updatedScores = {
      timestamp: 0,
      level: 2,
      str: 11,
      dex: 13,
      con: 15,
      intell: 17,
      wis: 16,
      cha: 14
    };

    beforeEach(async function () {
      // Create a character for testing
      await characterSheet.connect(addr1).createCharacter(testCharacter, testAbilityScores);
    });

    describe("createCharacter Gas Tests", function () {
      it("Measure gas for character creation", async function () {
        const character = {
          name: ethers.encodeBytes32String("MinGasTest"),
          raceClass: 0
        };

        const minScores = {
          timestamp: 0,
          level: 1,
          str: 3,
          dex: 3,
          con: 3,
          intell: 3,
          wis: 3,
          cha: 3
        };

         const estimatedGas = await characterSheet.connect(addr2).createCharacter.estimateGas(character, minScores);
         console.log(`createCharacter: ${estimatedGas} gas`);
         expect(estimatedGas).to.be.lessThan(BigInt(150000));
       });
    });

    describe("addChangeCharacter Gas Tests", function () {
             it("Measure gas for single character update", async function () {
         const estimatedGas = await characterSheet.connect(addr1).addChangeCharacter.estimateGas(updatedScores);
         console.log(`UpdateCharacter (single update): ${estimatedGas} gas`);
         expect(estimatedGas).to.be.lessThan(BigInt(100000));
       });

             it("Measure gas for multiple consecutive updates", async function () {
         let totalGas = BigInt(0);
         
         for (let i = 2; i <= 5; i++) {
           const scores = { ...updatedScores, level: i };
           const estimatedGas = await characterSheet.connect(addr1).addChangeCharacter.estimateGas(scores);
           totalGas += estimatedGas;
         }
        
        console.log(`UpdateCharacter (4 consecutive updates): ${totalGas} total gas`);
        expect(totalGas).to.be.lessThan(BigInt(400000));
      });
    });

    describe("getCharacter Gas Tests", function () {
             it("Measure gas for character retrieval", async function () {
         const estimatedGas = await characterSheet.connect(addr1).getCharacter.estimateGas();
         console.log(`GetCharacter: ${estimatedGas} gas`);
         expect(estimatedGas).to.be.lessThan(BigInt(50000));
       });

      it("Measure gas for character retrieval after multiple updates", async function () {
        // Add multiple updates first
        for (let i = 2; i <= 10; i++) {
          const scores = { ...updatedScores, level: i };
          await characterSheet.connect(addr1).addChangeCharacter(scores);
        }

         const estimatedGas = await characterSheet.connect(addr1).getCharacter.estimateGas();
         console.log(`GetCharacter (after 10 updates): ${estimatedGas} gas`);
         expect(estimatedGas).to.be.lessThan(BigInt(50000));
       });
    });

    describe("getAbilityScoresHistory Gas Tests", function () {
             it("Measure gas for history retrieval with single entry", async function () {
         const estimatedGas = await characterSheet.connect(addr1).getAbilityScoresHistory.estimateGas();
         console.log(`GetCharacterHistory (1 entry): ${estimatedGas} gas`);
         expect(estimatedGas).to.be.lessThan(BigInt(50000));
       });

      it("Measure gas for history retrieval with multiple entries", async function () {
        // Add multiple updates first
        for (let i = 2; i <= 10; i++) {
          const scores = { ...updatedScores, level: i };
          await characterSheet.connect(addr1).addChangeCharacter(scores);
        }

         const estimatedGas = await characterSheet.connect(addr1).getAbilityScoresHistory.estimateGas();
         console.log(`GetCharacterHistory (11 entries): ${estimatedGas} gas`);
         expect(estimatedGas).to.be.lessThan(BigInt(200000));
       });

      it("Measure gas for history retrieval with maximum entries", async function () {
        // Add many updates to test scalability
        for (let i = 2; i <= 50; i++) {
          const scores = { ...updatedScores, level: 10 };
          await characterSheet.connect(addr1).addChangeCharacter(scores);
        }

         const estimatedGas = await characterSheet.connect(addr1).getAbilityScoresHistory.estimateGas();
         console.log(`GetCharacterHistory (51 entries): ${estimatedGas} gas`);
         expect(estimatedGas).to.be.lessThan(BigInt(1000000));
       });
    });

    describe("getAbilityScoresHistoryLength Gas Tests", function () {
             it("Measure gas for history length retrieval with single entry", async function () {
         const estimatedGas = await characterSheet.connect(addr1).getAbilityScoresHistoryLength.estimateGas();
         console.log(`GetCharacterHistoryLength (1 entry): ${estimatedGas} gas`);
         expect(estimatedGas).to.be.lessThan(BigInt(30000));
       });

      it("Measure gas for history length retrieval with multiple entries", async function () {
        // Add multiple updates first
        for (let i = 2; i <= 20; i++) {
          const scores = { ...updatedScores, level: 10 };
          await characterSheet.connect(addr1).addChangeCharacter(scores);
        }

         const estimatedGas = await characterSheet.connect(addr1).getAbilityScoresHistoryLength.estimateGas();
         console.log(`GetCharacterHistoryLength (21 entries): ${estimatedGas} gas`);
         expect(estimatedGas).to.be.lessThan(BigInt(30000));
       });
    });

    describe("deleteCharacter Gas Tests", function () {
             it("Measure gas for character deletion", async function () {
         const estimatedGas = await characterSheet.connect(addr1).deleteCharacter.estimateGas();
         console.log(`DeleteCharacter: ${estimatedGas} gas`);
         expect(estimatedGas).to.be.lessThan(BigInt(100000));
       });

      it("Measure gas for character deletion with history", async function () {
        // Add multiple updates first
        for (let i = 2; i <= 10; i++) {
          const scores = { ...updatedScores, level: i };
          await characterSheet.connect(addr1).addChangeCharacter(scores);
        }

         const estimatedGas = await characterSheet.connect(addr1).deleteCharacter.estimateGas();
         console.log(`DeleteCharacter (with 10 history entries): ${estimatedGas} gas`);
         expect(estimatedGas).to.be.lessThan(BigInt(300000));
       });

      it("Measure gas for character deletion with maximum history", async function () {
        // Add many updates to test scalability
        for (let i = 2; i <= 50; i++) {
          const scores = { ...updatedScores, level: 10 };
          await characterSheet.connect(addr1).addChangeCharacter(scores);
        }

         const estimatedGas = await characterSheet.connect(addr1).deleteCharacter.estimateGas();
         console.log(`DeleteCharacter (with 50 history entries): ${estimatedGas} gas`);
         expect(estimatedGas).to.be.lessThan(BigInt(1000000));
       });

    });

    describe("Complex Scenario Gas Tests", function () {
             it("Measure gas for complete character lifecycle", async function () {
         let totalGas = BigInt(0);

         // Create character
         const createGas = await characterSheet.connect(addr2).createCharacter.estimateGas(testCharacter, testAbilityScores);
         // Actually create the character
         await characterSheet.connect(addr2).createCharacter(testCharacter, testAbilityScores);
         totalGas += createGas;
         

        // Update character multiple times
        for (let i = 2; i <= 5; i++) {
          const scores = { ...updatedScores, level: i };
          const updateTx = await characterSheet.connect(addr2).addChangeCharacter(scores);
          const updateReceipt = await updateTx.wait();
          totalGas += updateReceipt.gasUsed;
        }

        // Retrieve character
        totalGas += await characterSheet.connect(addr2).getCharacter.estimateGas();
        await characterSheet.connect(addr2).getCharacter();

        // Get history
        totalGas += await characterSheet.connect(addr2).getAbilityScoresHistory.estimateGas();;
        await characterSheet.connect(addr2).getAbilityScoresHistory();;

        // Get history length
        totalGas += await characterSheet.connect(addr2).getAbilityScoresHistoryLength.estimateGas();;
        await characterSheet.connect(addr2).getAbilityScoresHistoryLength();;

        // Delete character
        const deleteTx = await characterSheet.connect(addr2).deleteCharacter();
        const deleteReceipt = await deleteTx.wait();
        totalGas += deleteReceipt.gasUsed;

        console.log(`Complete character lifecycle: ${totalGas} total gas`);
        expect(totalGas).to.be.lessThan(BigInt(800000));
      });
    });
  });
});
