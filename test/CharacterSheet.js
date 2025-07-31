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
      ).to.be.revertedWith("Invalid level");
    });

    it("Should reject invalid level - too high", async function () {
      const invalidScores = { ...validAbilityScores, level: 21 };
      
      await expect(
        characterSheet.connect(addr1).createCharacter(validCharacter, invalidScores)
      ).to.be.revertedWith("Invalid level");
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

  describe("Race and Class Combinations", function () {
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

    it("Should accept all valid race-class combinations", async function () {
      const raceClasses = [
        "HumanFighter", "HumanMagicUser", "HumanCleric", "HumanThief",
        "DwarfFighter", "DwarfMagicUser", "DwarfCleric", "DwarfThief",
        "ElfFighter", "ElfMagicUser", "ElfCleric", "ElfThief",
        "HalflingFighter", "HalflingMagicUser", "HalflingCleric", "HalflingThief"
      ];

      for (let i = 0; i < raceClasses.length; i++) {
        const character = {
          name: ethers.encodeBytes32String(`Character${i}`),
          raceClass: i
        };

        await expect(
          characterSheet.connect(addrs[i]).createCharacter(character, validAbilityScores)
        ).to.not.be.reverted;
      }
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

    it("Should handle empty character name", async function () {
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
      ).to.not.be.reverted;
    });
  });

  describe("Gas Optimization", function () {
    it("Should use reasonable gas for character creation", async function () {
      const character = {
        name: ethers.encodeBytes32String("GasTest"),
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

      const tx = await characterSheet.connect(addr1).createCharacter(character, validAbilityScores);
      const receipt = await tx.wait();
      
      // Gas usage should be reasonable (less than 200k gas)
      expect(receipt.gasUsed).to.be.lessThan(200000);
    });
  });
});
