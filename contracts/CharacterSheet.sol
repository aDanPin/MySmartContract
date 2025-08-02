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

    mapping(address => Character) public characters;
    mapping(address => AbilityScores[]) public abilityScoresHistory;

    // Modifiers for better code organization
    modifier characterExists() {
        require(abilityScoresHistory[msg.sender].length > 0, "Character does not exist");
        _;
    }

    modifier characterDoesNotExist() {
        require(abilityScoresHistory[msg.sender].length <= 0, "Character already exists");
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

    modifier validLevel(uint8 level) {
        require(level > 0 
            && level <= MAX_LEVEL
            && abilityScoresHistory[msg.sender][abilityScoresHistory[msg.sender].length - 1].level <= level, 
            "Invalid level");
        _;
    }

    modifier validStartLevel(uint8 level) {
        require(level > 0 
            && level <= MAX_LEVEL,
            "Invalid start level");
        _;
    }

    modifier validName(bytes32 name) {
        require(name != bytes32(0), 
            "Invalid name");
        _;
    }

    function createCharacter(
        Character calldata character,
        AbilityScores calldata abilityScores
    ) 
        public 
        characterDoesNotExist()
        validName(character.name)
        validStartLevel(abilityScores.level)
        validAbilityScores(abilityScores)
    {
        characters[msg.sender] = character;
        
        // Store initial ability scores in history
        abilityScoresHistory[msg.sender].push(AbilityScores({
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

    function addChangeCharacter(
        AbilityScores calldata abilityScores
    ) 
        public 
        characterExists
        validLevel(abilityScores.level)
        validAbilityScores(abilityScores)
    {
        //Store historical ability scores
        abilityScoresHistory[msg.sender].push(AbilityScores({
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

    function getCharacter() 
        public 
        view 
        characterExists
        returns (
            Character memory,
            AbilityScores memory
        ) 
    {
        return (
            characters[msg.sender],
            abilityScoresHistory[msg.sender][abilityScoresHistory[msg.sender].length - 1]
        );
    }

    function getAbilityScoresHistory() 
        public 
        view 
        characterExists
        returns (AbilityScores[] memory) 
    {
        return abilityScoresHistory[msg.sender];
    }

    function getAbilityScoresHistoryLength() 
        public 
        view
        characterExists 
        returns (uint256) 
    {
        return abilityScoresHistory[msg.sender].length;
    }

    function deleteCharacter() public characterExists {
        delete characters[msg.sender];
        delete abilityScoresHistory[msg.sender];
    }
}
