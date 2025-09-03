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
      raceClass: 1, // HumanMagicUser
      level: 1,
      str: 10,
      dex: 12,
      con: 14,
      intell: 16,
      wis: 15,
      cha: 13
    };

    it("Should create a character successfully", async function () {
      const tx = await characterSheet.connect(addr1).createCharacter(validCharacter);
      const receipt = await tx.wait();
      
      // Get the character ID from the transaction
      let characterCount = await characterSheet.charactersCount();
      const characterId = characterCount - 1n;
      const character = await characterSheet.connect(addr1).getCharacter(ethers.toBigInt(characterId));
      expect(character.name).to.equal(validCharacter.name);
      expect(character.raceClass).to.equal(validCharacter.raceClass);
      expect(character.level).to.equal(validCharacter.level);
      expect(character.str).to.equal(validCharacter.str);
    });

    it("Should increment character count", async function () {
      const initialCount = await characterSheet.charactersCount();
      await characterSheet.connect(addr1).createCharacter(validCharacter);
      const newCount = await characterSheet.charactersCount();
      expect(newCount).to.equal(ethers.toBigInt(initialCount + 1n));
    });

    it("Should reject empty character name", async function () {
      const character = {
        name: ethers.encodeBytes32String(""),
        raceClass: 0,
        level: 1,
        str: 10,
        dex: 10,
        con: 10,
        intell: 10,
        wis: 10,
        cha: 10
      };

      await expect(
        characterSheet.connect(addr1).createCharacter(character)
      ).to.be.revertedWith("Invalid name");
    });

    it("Should reject invalid ability scores - too low", async function () {
      const invalidCharacter = { ...validCharacter, str: 2 };
      
      await expect(
        characterSheet.connect(addr1).createCharacter(invalidCharacter)
      ).to.be.revertedWith("Invalid strength score");
    });

    it("Should reject invalid ability scores - too high", async function () {
      const invalidCharacter = { ...validCharacter, dex: 19 };
      
      await expect(
        characterSheet.connect(addr1).createCharacter(invalidCharacter)
      ).to.be.revertedWith("Invalid dexterity score");
    });

    it("Should reject invalid level - too high", async function () {
      const invalidCharacter = { ...validCharacter, level: 21 };
      
      await expect(
        characterSheet.connect(addr1).createCharacter(invalidCharacter)
      ).to.be.revertedWith("Invalid level");
    });

    it("Should allow different users to create characters", async function () {
      const character2 = {
        name: ethers.encodeBytes32String("Aragorn"),
        raceClass: 0, // HumanFighter
        level: 1,
        str: 10,
        dex: 10,
        con: 10,
        intell: 10,
        wis: 10,
        cha: 10
      };

      await characterSheet.connect(addr1).createCharacter(validCharacter);
      await characterSheet.connect(addr2).createCharacter(character2);

      const characterId1 = 0;
      const characterId2 = 1;
      
      const char1 = await characterSheet.connect(addr1).getCharacter(characterId1);
      const char2 = await characterSheet.connect(addr2).getCharacter(characterId2);

      expect(char1.name).to.equal(validCharacter.name);
      expect(char2.name).to.equal(character2.name);
    });
  });

  describe("Character Updates", function () {
    const validCharacter = {
      name: ethers.encodeBytes32String("Legolas"),
      raceClass: 8, // ElfFighter
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

    let characterId;

    beforeEach(async function () {
      const tx = await characterSheet.connect(addr1).createCharacter(validCharacter);
      const receipt = await tx.wait();
      characterId = await characterSheet.charactersCount() - 1n;
    });

    it("Should update character ability scores successfully", async function () {
      await expect(characterSheet.connect(addr1).addChangeCharacter(characterId, updatedScores))
        .to.not.be.reverted;

      const history = await characterSheet.connect(addr1).getAbilityScoresHistory(characterId);
      expect(history.length).to.equal(1);
      expect(history[0].level).to.equal(updatedScores.level);
      expect(history[0].str).to.equal(updatedScores.str);
      expect(history[0].dex).to.equal(updatedScores.dex);
    });

    it("Should maintain character history", async function () {
      await characterSheet.connect(addr1).addChangeCharacter(characterId, updatedScores);

      const history = await characterSheet.connect(addr1).getAbilityScoresHistory(characterId);
      expect(history.length).to.equal(1);
      expect(history[0].level).to.equal(updatedScores.level);
    });

    it("Should not allow updates for non-existent character", async function () {
      await expect(
        characterSheet.connect(addr2).addChangeCharacter(999, updatedScores)
      ).to.be.revertedWith("Character does not exist");
    });

    it("Should reject invalid ability scores in updates", async function () {
      const invalidScores = { ...updatedScores, con: 2 };
      
      await expect(
        characterSheet.connect(addr1).addChangeCharacter(characterId, invalidScores)
      ).to.be.revertedWith("Invalid constitution score");
    });

    it("Should reject invalid level in updates", async function () {
      const invalidScores = { ...updatedScores, level: 21 };
      
      await expect(
        characterSheet.connect(addr1).addChangeCharacter(characterId, invalidScores)
      ).to.be.revertedWith("Invalid level");
    });
  });

  describe("Character Retrieval", function () {
    const validCharacter = {
      name: ethers.encodeBytes32String("Gimli"),
      raceClass: 4, // DwarfFighter
      level: 5,
      str: 18,
      dex: 10,
      con: 16,
      intell: 11,
      wis: 12,
      cha: 9
    };

    let characterId;

    beforeEach(async function () {
      const tx = await characterSheet.connect(addr1).createCharacter(validCharacter);
      const receipt = await tx.wait();
      characterId = await characterSheet.charactersCount() - 1n;
    });

    it("Should retrieve character data correctly", async function () {
      const character = await characterSheet.connect(addr1).getCharacter(characterId);
      
      expect(character.name).to.equal(validCharacter.name);
      expect(character.raceClass).to.equal(validCharacter.raceClass);
      expect(character.level).to.equal(validCharacter.level);
      expect(character.str).to.equal(validCharacter.str);
      expect(character.dex).to.equal(validCharacter.dex);
      expect(character.con).to.equal(validCharacter.con);
      expect(character.intell).to.equal(validCharacter.intell);
      expect(character.wis).to.equal(validCharacter.wis);
      expect(character.cha).to.equal(validCharacter.cha);
    });

    it("Should not allow retrieval for non-existent character", async function () {
      await expect(
        characterSheet.connect(addr2).getCharacter(999)
      ).to.be.revertedWith("Character does not exist");
    });

    it("Should return correct history length", async function () {
      expect(await characterSheet.connect(addr1).getAbilityScoresHistoryLength(characterId)).to.equal(0);
      
      const updatedScores = {
        timestamp: 0,
        level: 6,
        str: 18,
        dex: 10,
        con: 16,
        intell: 11,
        wis: 12,
        cha: 9
      };
      await characterSheet.connect(addr1).addChangeCharacter(characterId, updatedScores);
      
      expect(await characterSheet.connect(addr1).getAbilityScoresHistoryLength(characterId)).to.equal(1);
    });

    it("Should return complete ability scores history", async function () {
      
      const updatedScores = {
        timestamp: 0,
        level: 6,
        str: 18,
        dex: 10,
        con: 16,
        intell: 11,
        wis: 12,
        cha: 9
      };
      await characterSheet.connect(addr1).addChangeCharacter(characterId, updatedScores);

      const history = await characterSheet.connect(addr1).getAbilityScoresHistory(characterId);
      expect(history.length).to.equal(1);
      expect(history[0].level).to.equal(6);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle minimum valid ability scores", async function () {
      const character = {
        name: ethers.encodeBytes32String("MinStats"),
        raceClass: 0,
        level: 1,
        str: 3,
        dex: 3,
        con: 3,
        intell: 3,
        wis: 3,
        cha: 3
      };

      await expect(
        characterSheet.connect(addr1).createCharacter(character)
      ).to.not.be.reverted;
    });

    it("Should handle maximum valid ability scores", async function () {
      const character = {
        name: ethers.encodeBytes32String("MaxStats"),
        raceClass: 0,
        level: 20,
        str: 18,
        dex: 18,
        con: 18,
        intell: 18,
        wis: 18,
        cha: 18
      };

      await expect(
        characterSheet.connect(addr1).createCharacter(character)
      ).to.not.be.reverted;
    });
  });

  describe("Character History Management", function () {
    const validCharacter = {
      name: ethers.encodeBytes32String("HistoryTest"),
      raceClass: 0,
      level: 1,
      str: 10,
      dex: 10,
      con: 10,
      intell: 10,
      wis: 10,
      cha: 10
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

    let characterId;

    beforeEach(async function () {
      const tx = await characterSheet.connect(addr1).createCharacter(validCharacter);
      const receipt = await tx.wait();
      characterId = await characterSheet.charactersCount() - 1n;
    });

    it("Should maintain multiple history entries", async function () {
      // Add multiple updates
      for (let i = 2; i <= 5; i++) {
        const updatedScores = { ...baseScores, level: i, str: 10 + i };
        await characterSheet.connect(addr1).addChangeCharacter(characterId, updatedScores);
      }

      const history = await characterSheet.connect(addr1).getAbilityScoresHistory(characterId);
      expect(history.length).to.equal(4);
      
      // Check that history is maintained in order
      for (let i = 0; i < 4; i++) {
        expect(history[i].level).to.equal(i + 2);
      }
    });

    it("Should return latest character data after multiple updates", async function () {
      const finalScores = { ...baseScores, level: 10, str: 18, dex: 16 };
      await characterSheet.connect(addr1).addChangeCharacter(characterId, finalScores);

      const lastAbilityScores = await characterSheet.connect(addr1).getCharacterLastAbilityScores(characterId);
      
      expect(lastAbilityScores.level).to.equal(10); // Original character level doesn't change
      expect(lastAbilityScores.str).to.equal(18); // Original character stats don't change
    });
  });

  describe("Contract State Isolation", function () {
    it("Should isolate character data between different users", async function () {
      const character1 = {
        name: ethers.encodeBytes32String("User1"),
        raceClass: 0,
        level: 1,
        str: 15,
        dex: 12,
        con: 14,
        intell: 10,
        wis: 11,
        cha: 13
      };

      const character2 = {
        name: ethers.encodeBytes32String("User2"),
        raceClass: 1,
        level: 5,
        str: 10,
        dex: 16,
        con: 12,
        intell: 18,
        wis: 15,
        cha: 14
      };

      // Create characters for different users
      await characterSheet.connect(addr1).createCharacter(character1);
      await characterSheet.connect(addr2).createCharacter(character2);

      // Verify each user can access their character by ID
      const char1 = await characterSheet.connect(addr1).getCharacter(0);
      const char2 = await characterSheet.connect(addr2).getCharacter(1);

      expect(char1.name).to.equal(character1.name);
      expect(char2.name).to.equal(character2.name);
      expect(char1.level).to.equal(1);
      expect(char2.level).to.equal(5);
    });
  });

  describe("Gas Measurement Tests", function () {
    const testCharacter = {
      name: ethers.encodeBytes32String("GasTestCharacter"),
      raceClass: 0,
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

    let characterId;

    beforeEach(async function () {
      // Create a character for testing
      const tx = await characterSheet.connect(addr1).createCharacter(testCharacter);
      const receipt = await tx.wait();
      characterId = await characterSheet.charactersCount() - 1n;
    });

    describe("createCharacter Gas Tests", function () {
      it("Measure gas for character creation", async function () {
        const character = {
          name: ethers.encodeBytes32String("MinGasTest"),
          raceClass: 0,
          level: 1,
          str: 3,
          dex: 3,
          con: 3,
          intell: 3,
          wis: 3,
          cha: 3
        };

         const estimatedGas = await characterSheet.connect(addr2).createCharacter.estimateGas(character);
         console.log(`createCharacter: ${estimatedGas} gas`);
         expect(estimatedGas).to.be.lessThan(BigInt(150000));
       });
    });

    describe("addChangeCharacter Gas Tests", function () {
             it("Measure gas for single character update", async function () {
         const estimatedGas = await characterSheet.connect(addr1).addChangeCharacter.estimateGas(characterId, updatedScores);
         console.log(`UpdateCharacter (single update): ${estimatedGas} gas`);
         expect(estimatedGas).to.be.lessThan(BigInt(100000));
       });

             it("Measure gas for multiple consecutive updates", async function () {
         let totalGas = BigInt(0);
         
         for (let i = 2; i <= 5; i++) {
           const scores = { ...updatedScores, level: i };
           const estimatedGas = await characterSheet.connect(addr1).addChangeCharacter.estimateGas(characterId, scores);
           totalGas += estimatedGas;
         }
        
        console.log(`UpdateCharacter (4 consecutive updates): ${totalGas} total gas`);
        expect(totalGas).to.be.lessThan(BigInt(400000));
      });
    });

    describe("getCharacter Gas Tests", function () {
      it("Measure gas for character retrieval", async function () {
         const estimatedGas = await characterSheet.connect(addr1).getCharacter.estimateGas(characterId);
         console.log(`GetCharacter: ${estimatedGas} gas`);
         expect(estimatedGas).to.be.lessThan(BigInt(50000));
      });

      it("Measure gas for character retrieval after multiple updates", async function () {
        // Add multiple updates first
        for (let i = 2; i <= 10; i++) {
          const scores = { ...updatedScores, level: i };
          await characterSheet.connect(addr1).addChangeCharacter(characterId, scores);
        }

        const estimatedGas = await characterSheet.connect(addr1).getCharacter.estimateGas(characterId);
        console.log(`GetCharacter (after 10 updates): ${estimatedGas} gas`);
        expect(estimatedGas).to.be.lessThan(BigInt(50000));
       });
    });

    describe("getAbilityScoresHistory Gas Tests", function () {
      it("Measure gas for history retrieval with single entry", async function () {
         const estimatedGas = await characterSheet.connect(addr1).getAbilityScoresHistory.estimateGas(characterId);
         console.log(`GetCharacterHistory (1 entry): ${estimatedGas} gas`);
         expect(estimatedGas).to.be.lessThan(BigInt(50000));
       });

      it("Measure gas for history retrieval with multiple entries", async function () {
        // Add multiple updates first
        for (let i = 2; i <= 10; i++) {
          const scores = { ...updatedScores, level: i };
          await characterSheet.connect(addr1).addChangeCharacter(characterId, scores);
        }

         const estimatedGas = await characterSheet.connect(addr1).getAbilityScoresHistory.estimateGas(characterId);
         console.log(`GetCharacterHistory (11 entries): ${estimatedGas} gas`);
         expect(estimatedGas).to.be.lessThan(BigInt(200000));
       });

      it("Measure gas for history retrieval with maximum entries", async function () {
        // Add many updates to test scalability
        for (let i = 2; i <= 50; i++) {
          const scores = { ...updatedScores, level: 10 };
          await characterSheet.connect(addr1).addChangeCharacter(characterId, scores);
        }

         const estimatedGas = await characterSheet.connect(addr1).getAbilityScoresHistory.estimateGas(characterId);
         console.log(`GetCharacterHistory (51 entries): ${estimatedGas} gas`);
         expect(estimatedGas).to.be.lessThan(BigInt(1000000));
       });
    });

    describe("getAbilityScoresHistoryLength Gas Tests", function () {
             it("Measure gas for history length retrieval with single entry", async function () {
         const estimatedGas = await characterSheet.connect(addr1).getAbilityScoresHistoryLength.estimateGas(characterId);
         console.log(`GetCharacterHistoryLength (1 entry): ${estimatedGas} gas`);
         expect(estimatedGas).to.be.lessThan(BigInt(30000));
       });

      it("Measure gas for history length retrieval with multiple entries", async function () {
        // Add multiple updates first
        for (let i = 2; i <= 20; i++) {
          const scores = { ...updatedScores, level: 10 };
          await characterSheet.connect(addr1).addChangeCharacter(characterId, scores);
        }

         const estimatedGas = await characterSheet.connect(addr1).getAbilityScoresHistoryLength.estimateGas(characterId);
         console.log(`GetCharacterHistoryLength (21 entries): ${estimatedGas} gas`);
         expect(estimatedGas).to.be.lessThan(BigInt(30000));
       });
    });

    describe("Complex Scenario Gas Tests", function () {
        it("Measure gas for complete character lifecycle", async function () {
         let totalGas = BigInt(0);

         // Create character
         const createGas = await characterSheet.connect(addr2).createCharacter.estimateGas(testCharacter);
         // Actually create the character
         const createTx = await characterSheet.connect(addr2).createCharacter(testCharacter);
         const createReceipt = await createTx.wait();
         const newCharacterId = await characterSheet.charactersCount() - 1n;
         totalGas += createReceipt.gasUsed;
         

        // Update character multiple times
        for (let i = 2; i <= 5; i++) {
          const scores = { ...updatedScores, level: i };
          const updateTx = await characterSheet.connect(addr2).addChangeCharacter(newCharacterId, scores);
          const updateReceipt = await updateTx.wait();
          totalGas += updateReceipt.gasUsed;
        }

        // Retrieve character
        totalGas += await characterSheet.connect(addr2).getCharacter.estimateGas(newCharacterId);
        await characterSheet.connect(addr2).getCharacter(newCharacterId);

        // Get history
        totalGas += await characterSheet.connect(addr2).getAbilityScoresHistory.estimateGas(newCharacterId);;
        await characterSheet.connect(addr2).getAbilityScoresHistory(newCharacterId);

        // Get history length
        totalGas += await characterSheet.connect(addr2).getAbilityScoresHistoryLength.estimateGas(newCharacterId);
        await characterSheet.connect(addr2).getAbilityScoresHistoryLength(newCharacterId);

        console.log(`Complete character lifecycle: ${totalGas} total gas`);
        expect(totalGas).to.be.lessThan(BigInt(800000));
      });
    });
  });
});
