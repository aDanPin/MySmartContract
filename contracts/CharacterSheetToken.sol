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
    mapping(uint256 => CharacterShot) private _tokenCharacters;
    
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
     * @param characterPoints The character data to mint
     * @return tokenId The ID of the newly minted token
     */
    function mintCharacter(CharacterPoints calldata characterPoints) 
        public 
        validCharacterShot(characterPoints)
        returns (uint256 tokenId)
    {
        // Create the character in the base contract
        tokenId = super.createCharacter(characterPoints);
                
        // Mint the NFT to the caller
        _mint(msg.sender, tokenId);
        
        emit CharacterMinted(tokenId, msg.sender, characterPoints.name);
        
        return tokenId;
    }

    /**
     * @dev Updates a character's level and character shot
     * @param tokenId The token ID to update
     * @param characterPoints The new character points
     */
    function updateCharacter(
        uint256 tokenId,
        CharacterPoints calldata characterPoints
    ) 
        public 
        characterExists(tokenId)
        validCharacterShot(characterPoints)
    {
        // Check if caller owns the token
        require(ownerOf(tokenId) == msg.sender, "Not token owner");

        // Update the character in the base contract
        super.changeCharacter(tokenId, characterPoints);
                
        emit CharacterUpdated(tokenId);
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

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }
}
