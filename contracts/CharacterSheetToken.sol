// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./CharacterSheet.sol";

contract CharacterSheetToken is CharacterSheet, ERC721, Ownable {
    using Strings for uint256;

    // Base URI for token metadata
    string private _baseTokenURI;
    
    // Mapping from token ID to character data
    mapping(uint256 => Character) private _tokenCharacters;
    
    // Events
    event CharacterMinted(uint256 indexed tokenId, address indexed owner, bytes32 name);
    event CharacterUpdated(uint256 indexed tokenId);

    constructor(
        string memory name,
        string memory symbol,
        string memory baseTokenURI
    ) ERC721(name, symbol) Ownable(msg.sender) {
        _baseTokenURI = baseTokenURI;
    }

    /**
     * @dev Mints a new character as an NFT
     * @param character The character data to mint
     * @return tokenId The ID of the newly minted token
     */
    function mintCharacter(Character calldata character) 
        public 
        validName(character.name)
        validLevel(character.level)
        validCharacterScores(character)
        returns (uint256 tokenId)
    {
        // Create the character in the base contract
        tokenId = super.createCharacter(character);
                
        // Mint the NFT to the caller
        _mint(msg.sender, tokenId);
        
        emit CharacterMinted(tokenId, msg.sender, character.name);
        
        return tokenId;
    }

    /**
     * @dev Updates a character's level and ability scores
     * @param tokenId The token ID to update
     * @param abilityScores The new ability scores
     */
    function updateCharacter(
        uint256 tokenId,
        AbilityScores calldata abilityScores
    ) 
        public 
        characterExists(tokenId)
        validLevel(abilityScores.level)
        validAbilityScores(abilityScores)
    {
        // Check if caller owns the token
        require(ownerOf(tokenId) == msg.sender, "Not token owner");

        // Update the character in the base contract
        super.addChangeCharacter(tokenId, abilityScores);
                
        emit CharacterUpdated(tokenId);
    }

    /**
     * @dev Gets the character data for a specific token
     * @param tokenId The token ID
     * @return The character data
     */
    function getTokenCharacter(uint256 tokenId) 
        public 
        view 
        returns (Character memory) 
    {
        require(ownerOf(tokenId) != address(0), "Token does not exist");
        return super.getCharacter(tokenId);
    }

    /**
     * @dev Required override for ERC721
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
