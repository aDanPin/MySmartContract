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

    struct Character {
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

    struct AbilityScores {
        uint256 timestamp;
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

    mapping(uint256 => Character) public characters;
    mapping(uint256 => AbilityScores[]) public abilityScoresHistory;

    // Modifiers for better code organization
    modifier characterExists(uint256 id) {
        require(id >= 0 && id < charactersCount, "Character does not exist");
        _;
    }

    modifier characterDoesNotExist(uint256 id) {
        require(id >= charactersCount, "Character already exists");
        _;
    }

    modifier validAbilityScores(AbilityScores calldata abilityScores) {
        require(abilityScores.str >= MIN_ABILITY_SCORE && abilityScores.str <= MAX_ABILITY_SCORE, "Invalid strength score");
        require(abilityScores.dex >= MIN_ABILITY_SCORE && abilityScores.dex <= MAX_ABILITY_SCORE, "Invalid dexterity score");
        require(abilityScores.con >= MIN_ABILITY_SCORE && abilityScores.con <= MAX_ABILITY_SCORE, "Invalid constitution score");
        require(abilityScores.intell >= MIN_ABILITY_SCORE && abilityScores.intell <= MAX_ABILITY_SCORE, "Invalid intelligence score");
        require(abilityScores.wis >= MIN_ABILITY_SCORE && abilityScores.wis <= MAX_ABILITY_SCORE, "Invalid wisdom score");
        require(abilityScores.cha >= MIN_ABILITY_SCORE && abilityScores.cha <= MAX_ABILITY_SCORE, "Invalid charisma score");
        _;
    }

    modifier validCharacterScores(Character calldata character) {
        require(character.str >= MIN_ABILITY_SCORE && character.str <= MAX_ABILITY_SCORE, "Invalid strength score");
        require(character.dex >= MIN_ABILITY_SCORE && character.dex <= MAX_ABILITY_SCORE, "Invalid dexterity score");
        require(character.con >= MIN_ABILITY_SCORE && character.con <= MAX_ABILITY_SCORE, "Invalid constitution score");
        require(character.intell >= MIN_ABILITY_SCORE && character.intell <= MAX_ABILITY_SCORE, "Invalid intelligence score");
        require(character.wis >= MIN_ABILITY_SCORE && character.wis <= MAX_ABILITY_SCORE, "Invalid wisdom score");
        require(character.cha >= MIN_ABILITY_SCORE && character.cha <= MAX_ABILITY_SCORE, "Invalid charisma score");
        _;
    }

    modifier validLevel(uint8 level) {
        require(level <= MAX_LEVEL && level >= 0,
            "Invalid level");
        _;
    }

    modifier validName(bytes32 name) {
        require(name != bytes32(0), 
            "Invalid name");
        _;
    }

    modifier noEmptyHistory(uint256 id) {
        require(abilityScoresHistory[id].length > 0, "No ability scores history");
        _;
    }

    function createCharacter(
        Character calldata character
    ) 
        public 
        validName(character.name)
        validLevel(character.level)
        validCharacterScores(character)
        returns (uint256 id)
    {
        id = charactersCount;

        characters[id] = character;
        charactersCount++;
        return id;
    }

    function addChangeCharacter(
        uint256 id,
        AbilityScores calldata abilityScores
    ) 
        public 
        characterExists(id)
        validLevel(abilityScores.level)
        validAbilityScores(abilityScores)
    {
        //Store historical ability scores
        abilityScoresHistory[id].push(AbilityScores({
            timestamp: block.timestamp,
            level: abilityScores.level,
            str: abilityScores.str,
            dex: abilityScores.dex,
            con: abilityScores.con,
            intell: abilityScores.intell,
            wis: abilityScores.wis,
            cha: abilityScores.cha
        }));
    }

    function getCharacter(uint256 id) 
        public 
        view 
        characterExists(id)
        returns (Character memory) 
    {
        return characters[id];
    }

    function getCharacterLastAbilityScores(uint256 id) 
        public 
        view 
        characterExists(id)
        noEmptyHistory(id)
        returns (AbilityScores memory) 
    {
        return abilityScoresHistory[id][abilityScoresHistory[id].length - 1];
    }

    function getAbilityScoresHistory(uint256 id) 
        public 
        view 
        characterExists(id)
        returns (AbilityScores[] memory) 
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
