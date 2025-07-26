// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

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

    struct AbilityScores {
        uint8 level;
        uint8 str;
        uint8 dex;
        uint8 con;
        uint8 intell;
        uint8 wis;
        uint8 cha;
    }

    struct Sheet {
        bytes32 name;
        AbilityScores abilityScores;
        RaceClass raceClass;
    }

    function diff(AbilityScores storage ls, AbilityScores calldata rs) internal {
        ls.level = ls.level - rs.level;
        ls.str = ls.str - rs.str;
        ls.dex = ls.dex - rs.dex;
        ls.con = ls.con - rs.con;
        ls.intell = ls.intell - rs.intell;
        ls.wis = ls.wis - rs.wis;
        ls.cha = ls.cha - rs.cha;
    }

    function sum(AbilityScores storage ls, AbilityScores calldata rs) internal {
        ls.level = ls.level + rs.level;
        ls.str = ls.str + rs.str;
        ls.dex = ls.dex + rs.dex;
        ls.con = ls.con + rs.con;
        ls.intell = ls.intell + rs.intell;
        ls.wis = ls.wis + rs.wis;
        ls.cha = ls.cha + rs.cha;
    }

    struct Character {
        Sheet sheet;
    }

    struct Change {
        uint256 timestamp;
        AbilityScores abilityScores;
    }

    mapping (address => Change[]) public changes;
    mapping (address => Character) public  characters;

    function CommitChangeCharacter(
                AbilityScores calldata abilityScores 
    ) public {
        sum(characters[msg.sender].sheet.abilityScores, abilityScores);
        changes[msg.sender].push(Change(block.timestamp, abilityScores));
    }

    function InitCharacter(
                bytes32 name,
                RaceClass raceClass,
                AbilityScores calldata abilityScores
    ) public {
        Character storage character = characters[msg.sender];
        character.sheet.name = name;
        character.sheet.raceClass = raceClass;
        CommitChangeCharacter(abilityScores);
    }
}
