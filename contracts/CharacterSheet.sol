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

    struct StableCharacterInfo {
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

    mapping (address => AbilityScores[]) public abilityScores;
    mapping (address => StableCharacterInfo) public  characters;

    function getSum(
        uint8 level,
        uint8 str,
        uint8 dex,
        uint8 con,
        uint8 intell,
        uint8 wis,
        uint8 cha
    ) internal view returns (AbilityScores memory) {
        AbilityScores memory sumAbilityScore = abilityScores[msg.sender][abilityScores[msg.sender].length];

        sumAbilityScore.timestamp = block.timestamp;
        sumAbilityScore.level = sumAbilityScore.level +  level;
        sumAbilityScore.str = sumAbilityScore.str +    str;
        sumAbilityScore.dex = sumAbilityScore.dex +    dex;
        sumAbilityScore.con = sumAbilityScore.con +    con;
        sumAbilityScore.intell = sumAbilityScore.intell + intell;
        sumAbilityScore.wis = sumAbilityScore.wis +    wis;
        sumAbilityScore.cha = sumAbilityScore.cha +    cha;

        return sumAbilityScore;
    }

    function CommitChangeCharacter(uint8 level, uint8 str, uint8 dex, uint8 con, uint8 intell, uint8 wis, uint8 cha) public {
        abilityScores[msg.sender].push(
            getSum( level, str, dex, con, intell, wis, cha)
        );
    }

    function InitCharacter(
                bytes32 name,
                RaceClass raceClass,
                uint8 level, uint8 str, uint8 dex, uint8 con, uint8 intell, uint8 wis, uint8 cha
    ) public {
        StableCharacterInfo storage character = characters[msg.sender];
        character.name = name;
        character.raceClass = raceClass;
        CommitChangeCharacter(level, str, dex, con, intell, wis, cha);
    }
}
