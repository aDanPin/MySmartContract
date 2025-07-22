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
        RaceClass raceClass;
        AbilityScores abilityScores;
    }

    error differentSheetNames(bytes32 l, bytes32 r);

    function diff(Sheet calldata ls, Sheet calldata rs) pure internal  returns (Sheet memory ans) {
        if(ls.name == rs.name) {
            revert differentSheetNames(ls.name, rs.name);
        }

        return Sheet(
            ls.name,            
            ls.raceClass,
            AbilityScores(
                ls.abilityScores.level - rs.abilityScores.level,
                ls.abilityScores.str - rs.abilityScores.str,
                ls.abilityScores.dex - rs.abilityScores.dex,
                ls.abilityScores.con - rs.abilityScores.con,
                ls.abilityScores.intell - rs.abilityScores.intell,
                ls.abilityScores.wis - rs.abilityScores.wis,
                ls.abilityScores.cha - rs.abilityScores.cha
            )
        );
    }

    function sum(Sheet calldata ls, Sheet calldata rs) pure internal  returns (Sheet memory ans) {
        if(ls.name == rs.name) {
            revert differentSheetNames(ls.name, rs.name);
        }

        return Sheet(
            ls.name,            
            ls.raceClass,
            AbilityScores(
                ls.abilityScores.level - rs.abilityScores.level,
                ls.abilityScores.str - rs.abilityScores.str,
                ls.abilityScores.dex - rs.abilityScores.dex,
                ls.abilityScores.con - rs.abilityScores.con,
                ls.abilityScores.intell - rs.abilityScores.intell,
                ls.abilityScores.wis - rs.abilityScores.wis,
                ls.abilityScores.cha - rs.abilityScores.cha
            )
        );
    }

    mapping(address => Sheet[]) public characters;

    function getCharacter(address _owner, uint _index) public view returns (Sheet memory) {
        require(_index < characters[_owner].length, "Character does not exist");
        return characters[_owner][_index];
    }

    function getCharacterCount(address _owner) public view returns (uint) {
        return characters[_owner].length;
    }
}