const { expect } = require("chai");
const { toBigInt } = require("ethers");
const { ethers } = require("hardhat");

describe("CharacterSheetToken", function () {
  let characterSheetToken;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    // Get signers
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the contract
    const CharacterSheetToken = await ethers.getContractFactory("CharacterSheetToken");
    characterSheetToken = await CharacterSheetToken.deploy(
      "Character Sheet NFT",
      "CSNFT",
      "https://api.example.com/metadata/"
    );
    await characterSheetToken.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await characterSheetToken.owner()).to.equal(owner.address);
    });

    it("Should set the correct name and symbol", async function () {
      expect(await characterSheetToken.name()).to.equal("Character Sheet NFT");
      expect(await characterSheetToken.symbol()).to.equal("CSNFT");
    });

    it("Should start with 0 characters", async function () {
      expect(await characterSheetToken.charactersCount()).to.equal(0);
    });
  });

  describe("Character Minting", function () {
    it("Should mint a character successfully", async function () {
      const character = {
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

      await expect(characterSheetToken.connect(addr1).mintCharacter(character))
        .to.emit(characterSheetToken, "CharacterMinted")
        .withArgs(0, addr1.address, character.name);

      expect(await characterSheetToken.ownerOf(0)).to.equal(addr1.address);
      expect(await characterSheetToken.charactersCount()).to.equal(1);
    });

    it("Should fail to mint with invalid ability scores", async function () {
      const invalidCharacter = {
        name: ethers.encodeBytes32String("Weakling"),
        raceClass: 0, // HumanFighter
        level: 1,
        str: 2, // Below minimum
        dex: 12,
        con: 14,
        intell: 16,
        wis: 15,
        cha: 13
      };

      await expect(
        characterSheetToken.connect(addr1).mintCharacter(invalidCharacter)
      ).to.be.revertedWith("Invalid strength score");
    });

    it("Should fail to mint with invalid level", async function () {
      const invalidCharacter = {
        name: ethers.encodeBytes32String("Overpowered"),
        raceClass: 0, // HumanFighter
        level: 25, // Above maximum
        str: 10,
        dex: 12,
        con: 14,
        intell: 16,
        wis: 15,
        cha: 13
      };

      await expect(
        characterSheetToken.connect(addr1).mintCharacter(invalidCharacter)
      ).to.be.revertedWith("Invalid level");
    });
  });

  describe("Character Updates", function () {
    let tokenId;

    beforeEach(async function () {
      const character = {
        name: ethers.encodeBytes32String("Aragorn"),
        raceClass: 0, // HumanFighter
        level: 1,
        str: 16,
        dex: 14,
        con: 15,
        intell: 12,
        wis: 13,
        cha: 11
      };

      const tx = await characterSheetToken.connect(addr1).mintCharacter(character);
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => 
        log.fragment && log.fragment.name === "CharacterMinted"
      );
      tokenId = event.args.tokenId;
    });

    it("Should update character successfully", async function () {
      const newAbilityScores = {
        name: ethers.encodeBytes32String("Aragorn"),
        raceClass: 0,
        level: 2,
        str: 17,
        dex: 15,
        con: 16,
        intell: 13,
        wis: 14,
        cha: 12
      };

      await expect(characterSheetToken.connect(addr1).updateCharacter(tokenId, newAbilityScores))
        .to.emit(characterSheetToken, "CharacterUpdated")
        .withArgs(tokenId);

      const updatedCharacter = await characterSheetToken.getLastCharacterShot(tokenId);
      expect(updatedCharacter.level).to.equal(2);
      expect(updatedCharacter.str).to.equal(17);
    });

    it("Should fail to update character if not owner", async function () {
      const newAbilityScores = {
        name: ethers.encodeBytes32String("Aragorn"),
        raceClass: 0,
        level: 2,
        str: 17,
        dex: 15,
        con: 16,
        intell: 13,
        wis: 14,
        cha: 12
      };

      await expect(
        characterSheetToken.connect(addr2).updateCharacter(tokenId, newAbilityScores)
      ).to.be.revertedWith("Not token owner");
    });
  });

  describe("Character Queries", function () {
    let tokenId;

    beforeEach(async function () {
      const character = {
        name: ethers.encodeBytes32String("Legolas"),
        raceClass: 8, // ElfFighter
        level: 3,
        str: 12,
        dex: 18,
        con: 13,
        intell: 14,
        wis: 15,
        cha: 16
      };

      const tx = await characterSheetToken.connect(addr1).mintCharacter(character);
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => 
        log.fragment && log.fragment.name === "CharacterMinted"
      );
      tokenId = event.args.tokenId;
    });

    it("Should return correct character data", async function () {
      const character = await characterSheetToken.getLastCharacterShot(tokenId);
      expect(character.name).to.equal(ethers.encodeBytes32String("Legolas"));
      expect(character.raceClass).to.equal(8);
      expect(character.level).to.equal(3);
      expect(character.dex).to.equal(18);
    });

    it("Should return correct  number of tokens for owner", async function () {
      const tokens = await characterSheetToken.balanceOf(addr1.address);
      expect(tokens).to.equal(1);
    });
  });

  describe("Metadata", function () {
    it("Should return correct token URI", async function () {
      const character = {
        name: ethers.encodeBytes32String("Gimli"),
        raceClass: 4, // DwarfFighter
        level: 1,
        str: 18,
        dex: 10,
        con: 16,
        intell: 11,
        wis: 12,
        cha: 9
      };

      await characterSheetToken.connect(addr1).mintCharacter(character);
      
      const tokenURI = await characterSheetToken.tokenURI(0);
      expect(tokenURI).to.equal("https://api.example.com/metadata/0");
    });
  });

  
  describe("Transfers", function () {
    let tokenId;

    beforeEach(async function () {
      const character = {
        name: ethers.encodeBytes32String("Frodo"),
        raceClass: 1, // HobbitRogue
        level: 1,
        str: 8,
        dex: 16,
        con: 10,
        intell: 14,
        wis: 13,
        cha: 12
      };
      const tx = await characterSheetToken.connect(addr1).mintCharacter(character);
      const receipt = await tx.wait();
      // tokenId is always 0 for first mint in this test setup
      tokenId = 0;
    });

    it("Should transfer token with transferFrom", async function () {
      // addr1 owns tokenId 0, transfer to addr2
      await characterSheetToken.connect(addr1).transferFrom(addr1.address, addr2.address, tokenId);
      expect(await characterSheetToken.ownerOf(tokenId)).to.equal(addr2.address);
    });

    it("Should transfer token with safeTransferFrom", async function () {
      // addr1 owns tokenId 0, transfer to addr2
      await characterSheetToken.connect(addr1)["safeTransferFrom(address,address,uint256)"](
        addr1.address,
        addr2.address,
        tokenId
      );
      expect(await characterSheetToken.ownerOf(tokenId)).to.equal(addr2.address);
    });

    it("Should revert transfer if not owner or approved", async function () {
      await expect(
        characterSheetToken.connect(addr2).transferFrom(addr1.address, addr2.address, tokenId)
      ).to.be.revertedWithCustomError(characterSheetToken, "ERC721InsufficientApproval")
        .withArgs(addr2.address, tokenId);
    });

    it("Should allow approved address to transfer", async function () {
      await characterSheetToken.connect(addr1).approve(addr2.address, tokenId);
      await characterSheetToken.connect(addr2).transferFrom(addr1.address, addr2.address, tokenId);
      expect(await characterSheetToken.ownerOf(tokenId)).to.equal(addr2.address);
      expect(await characterSheetToken.ownerOf(tokenId)).to.not.equal(addr1.address);
    });

    it("Should revert safeTransferFrom to contract that does not implement ERC721Receiver", async function () {
      // Deploy a contract that does not implement ERC721Receiver
      const NonReceiver = await ethers.getContractFactory("CharacterSheetToken");
      const nonReceiver = await NonReceiver.deploy("Test", "TST", "https://api.example.com/metadata/");
      await nonReceiver.waitForDeployment();

      await expect(
        characterSheetToken.connect(addr1)["safeTransferFrom(address,address,uint256)"](
          addr1.address,
          nonReceiver.target,
          tokenId
        )
      ).to.be.revertedWithCustomError(characterSheetToken, "ERC721InvalidReceiver")
        .withArgs(nonReceiver.target);
    });
  });

  it("Gas: mint one char, update 50 times, get char", async function () {
    // Mint one character
    const char = {
      name: ethers.encodeBytes32String("GasHero"),
      raceClass: 0,
      level: 1,
      str: 10,
      dex: 10,
      con: 10,
      intell: 10,
      wis: 10,
      cha: 10
    };

    const mintTx = await characterSheetToken.connect(addr1).mintCharacter(char);
    const mintReceipt = await mintTx.wait();
    const tokenId = mintReceipt.logs
      .map(log => log.args && log.args.tokenId)
      .find(id => id !== undefined) ?? 0;
    console.log("Gas mint:", mintReceipt.gasUsed.toString());

    // Update this character 50 times
    let totalUpdateGas = 0n;
    for (let i = 0; i < 50; i++) {
      const abilityScores = {
        name: ethers.encodeBytes32String("GasHero"),
        raceClass: 0,
        level: 1 + i > 20 ? 20 : 1 + i,
        str: 10 + Math.floor(i % 9),
        dex: 10 + Math.floor((i + 1) % 9),
        con: 10 + Math.floor((i + 2) % 9),
        intell: 10 + Math.floor((i + 3) % 9),
        wis: 10 + Math.floor((i + 4) % 9),
        cha: 10 + Math.floor((i + 5) % 9)
      };
      const updateTx = await characterSheetToken.connect(addr1).updateCharacter(tokenId, abilityScores);
      const updateReceipt = await updateTx.wait();
      totalUpdateGas += updateReceipt.gasUsed;
    }
    // Print gas for last update
    console.log("Everage update gas:", (totalUpdateGas / 50n).toString());

    // Gas measurement for getCharacterLastAbilityScores using a transaction and receipt
    const data1 = characterSheetToken.interface.encodeFunctionData("getLastCharacterShot", [tokenId]);
    const gas1 = await ethers.provider.estimateGas({
      to: addr1.address,
      data: data1,
    });
    console.log("Gas getLastCharacterShot:", gas1.toString());

    // Get last ability scores and check values
    const lastScores = await characterSheetToken.getLastCharacterShot(tokenId);
    expect(lastScores.level).to.equal(20);
    expect(lastScores.str).to.equal(10 + Math.floor(49 % 9));
    expect(lastScores.dex).to.equal(10 + Math.floor((49 + 1) % 9));
    expect(lastScores.con).to.equal(10 + Math.floor((49 + 2) % 9));
    expect(lastScores.intell).to.equal(10 + Math.floor((49 + 3) % 9));
    expect(lastScores.wis).to.equal(10 + Math.floor((49 + 4) % 9));
    expect(lastScores.cha).to.equal(10 + Math.floor((49 + 5) % 9));
  });
});

