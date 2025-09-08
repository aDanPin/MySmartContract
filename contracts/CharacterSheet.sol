// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract CharacterSheet {
    enum RaceClass {
        HumanFighter,
        HumanMagicUser,
        HumanCleric,
        HumanThief,
        DwarfFighter,
        DwarfMagicUser,
        DwarfCleric,
        DwarfThief,
        ElfFighter,
        ElfMagicUser,
        ElfCleric,
        ElfThief,
        HalflingFighter,
        HalflingMagicUser,
        HalflingCleric,
        HalflingThief
    }

    struct CharacterPoints {
        bytes32 name;
        RaceClass raceClass;
        uint8 level;
        uint8 str;
        uint8 dex;
        uint8 con;
        uint8 intell;
        uint8 wis;
        uint8 cha;
    }

    struct CharacterShot {
        uint256 timestamp;
        bytes32 name;
        RaceClass raceClass;
        uint8 level;
        uint8 str;
        uint8 dex;
        uint8 con;
        uint8 intell;
        uint8 wis;
        uint8 cha;
    }
    // Constants for validation
    uint8 public constant MIN_ABILITY_SCORE = 3;
    uint8 public constant MAX_ABILITY_SCORE = 18;
    uint8 public constant MAX_LEVEL = 20;

    uint256 public charactersCount;

    mapping(uint256 => CharacterShot[]) public abilityScoresHistory;

    // Modifiers for better code organization
    modifier characterExists(uint256 id) {
        require(id >= 0 && id < charactersCount, "Character does not exist");
        _;
    }

    modifier characterDoesNotExist(uint256 id) {
        require(id >= charactersCount, "Character already exists");
        _;
    }

    modifier validCharacterShot(CharacterPoints calldata characterShot) {
        require(characterShot.level >= 0 && characterShot.level <= MAX_LEVEL, "Invalid level");
        require(characterShot.name != bytes32(0), "Invalid name");
        require(characterShot.str >= MIN_ABILITY_SCORE && characterShot.str <= MAX_ABILITY_SCORE, "Invalid strength score");
        require(characterShot.dex >= MIN_ABILITY_SCORE && characterShot.dex <= MAX_ABILITY_SCORE, "Invalid dexterity score");
        require(characterShot.con >= MIN_ABILITY_SCORE && characterShot.con <= MAX_ABILITY_SCORE, "Invalid constitution score");
        require(characterShot.intell >= MIN_ABILITY_SCORE && characterShot.intell <= MAX_ABILITY_SCORE, "Invalid intelligence score");
        require(characterShot.wis >= MIN_ABILITY_SCORE && characterShot.wis <= MAX_ABILITY_SCORE, "Invalid wisdom score");
        require(characterShot.cha >= MIN_ABILITY_SCORE && characterShot.cha <= MAX_ABILITY_SCORE, "Invalid charisma score");
        _;
    }

    function createCharacter(
        CharacterPoints calldata character
    ) 
        public 
        validCharacterShot(character)
        returns (uint256 id)
    {
        id = charactersCount;

        abilityScoresHistory[id].push(CharacterShot({
            timestamp: block.timestamp,
            name: character.name,
            raceClass: character.raceClass,
            level: character.level,
            str: character.str,
            dex: character.dex,
            con: character.con,
            intell: character.intell,
            wis: character.wis,
            cha: character.cha
        }));
        charactersCount++;
        return id;
    }

    function changeCharacter(
        uint256 id,
        CharacterPoints calldata characterShot
    ) 
        public 
        characterExists(id)
        validCharacterShot(characterShot)
    {
        //Store historical ability scores
        abilityScoresHistory[id].push(CharacterShot({
            timestamp: block.timestamp,
            name: characterShot.name,
            raceClass: characterShot.raceClass,
            level: characterShot.level,
            str: characterShot.str,
            dex: characterShot.dex,
            con: characterShot.con,
            intell: characterShot.intell,
            wis: characterShot.wis,
            cha: characterShot.cha
        }));
    }

    function getLastCharacterShot(uint256 id) 
        public 
        view 
        characterExists(id)
        returns (CharacterShot memory) 
    {
        return abilityScoresHistory[id][abilityScoresHistory[id].length - 1];
    }

    function getCharacterShotHaistory(uint256 id) 
        public 
        view 
        characterExists(id)
        returns (CharacterShot[] memory) 
    {
        return abilityScoresHistory[id];
    }

    function getAbilityScoresHistoryLength(uint256 id) 
        public 
        view
        characterExists(id)
        returns (uint256) 
    {
        return abilityScoresHistory[id].length;
    }
}
