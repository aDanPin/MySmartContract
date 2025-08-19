// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import { UD60x18, convert, div, sub, ud } from "@prb/math/src/UD60x18.sol";

contract Bet {    
    uint256 public SCALE = 10000;
  
    // Bet round structure
    struct BetRound {
        bytes32 description;
        uint256 startTime;
        uint256 endTime;
        uint256 totalXBetAmount;
        uint256 totalYBetAmount;
        uint256 creatorFee; // Creator fee is a part of all bet amount. If creator wants 10% fee amount they should put 10 to creatorFee.
                          // 100 for 1%, 123 for 0.813%, 2 for 50%.
        address creator;
        uint8 betState;
        // 0 - does not exist 
        // 1 - inProcess
        // 2 - cancelled
        // 3 - win X
        // 4 - win Y
        // 5 - draw
    }

    mapping(uint256 => mapping(address => uint256)) internal xBets; // betId => Address => amount bet on X
    mapping(uint256 => mapping(address => uint256)) internal yBets; // betId => Address => amount bet on Y
    mapping(uint256 => address[]) internal xParticipants; // betId => Address
    mapping(uint256 => address[]) internal yParticipants; // betId => Address
    
    // Merkle tree root for each round's winners
    mapping(uint256 => bytes32) internal merkleRoots;
    
    // Track claimed wins to prevent double claiming
    mapping(uint256 => mapping(address => bool)) internal claimedWins;
    mapping(uint256 => bool) internal claimedFees;

    // Bet rounds tracking
    mapping(uint256 => BetRound) internal betRounds;
    uint256 internal nextRoundId;
    
    // Events
    event BetRoundCreated(uint256 indexed roundId, bytes32 indexed description);
    event BetRoundEnded(uint256 indexed roundId, bytes32 indexed description, uint8 indexed betState);
    event MerkleRootSet(uint256 indexed roundId, bytes32 indexed merkleRoot);
    event Betplaced(uint256 indexed roundId, uint8 xOrY, address indexed bettor, uint256 amount);
    event WinClaimed(uint256 indexed roundId, address indexed winner, uint256 amount);
    event FeeClaimed(uint256 indexed roundId, address indexed creator, uint256 amount);
    
    error WinIsOutOfPool(address winner, address creator, uint256 betId, uint256 win);
    error InvalidMerkleProof();
    error WinAlreadyClaimed();
    error WinNotFound();
    error FeeAlreadyClaimed();

    modifier onlyCreator(uint256 roundId) {
        require(betRounds[roundId].creator == msg.sender, "Only creator can call this function");
        _;
    }
    
    modifier roundExists(uint256 roundId) {
        require(roundId < nextRoundId, "Bet round does not exist");
        _;
    }
    
    modifier roundActive(uint256 roundId) {
        require(betRounds[roundId].betState == 1 , "Round is not active."); // startTime is a time of creation BetRound so we need to check only endTime
        _;
    }
    
    modifier roundEnded(uint256 roundId) {
        BetRound memory round = betRounds[roundId];
        require(round.betState == 2 ||
                round.betState == 3 ||
                round.betState == 4 ||
                round.betState == 5, "Bet is still active");
        _;
    }

    modifier finishingState(uint8 state) {
        require(state == 2 ||
                state == 3 ||
                state == 4 ||
                state == 5, "Not relevant incoming state.");
        _;
    }

    modifier newIdAvailable() {
        require(nextRoundId <= type(uint256).max, "Maximum bet rounds number had reached");
        _;
    }

    modifier hasNoBetOnThisRound(uint256 roundId) {
        require(xBets[roundId][msg.sender] == 0 && yBets[roundId][msg.sender] == 0, "Has bet on this round");
        _;
    }

    modifier proofIsCorrect(uint256 roundId, uint256 sentAmount, bytes32[] calldata proof) {
        bytes32 merkleRoot = merkleRoots[roundId];
        if (merkleRoot == bytes32(0)) {
            revert WinNotFound();
        }
        // Create the leaf hash
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, sentAmount));

        // Verify the Merkle proof
        if (!MerkleProof.verify(proof, merkleRoot, leaf)) {
            revert InvalidMerkleProof();
        }
        _;
    }
    modifier winHasNotBeenClaimed(uint256 roundId, address winner) {
        // Check if already claimed
        if (claimedWins[roundId][msg.sender]) {
            revert WinAlreadyClaimed();
        }
        _;
    }

    modifier feeHasNotBeenClaimed(uint256 roundId) {
        if (claimedFees[roundId]) {
            revert FeeAlreadyClaimed();
        }
        _;
    }

    // Create a new betting round
    function createBetRound(
        bytes32 description, uint creatorsFee
    ) external newIdAvailable returns (uint256 roundId) {
        roundId = nextRoundId;
        nextRoundId += 1;
        
        BetRound storage newRound = betRounds[roundId];
        newRound.description = description;
        newRound.startTime = block.timestamp;
        newRound.betState = 1;
        newRound.creatorFee = creatorsFee;
        newRound.creator = msg.sender;

        emit BetRoundCreated(roundId, description);
        
        return roundId;
    }
    
    // Place a bet on a specific round
    // xOrY : 0 = x, 1 = y
    function placeBet(uint256 roundId, uint8 xOrY) external payable roundExists(roundId)
                                                                    roundActive(roundId)
                                                                    hasNoBetOnThisRound(roundId) {
        require(msg.value > 0, "Bet amount must be greater than 0");
        
        BetRound storage round = betRounds[roundId];
        
        if (xOrY == 0) {
            xBets[roundId][msg.sender] += msg.value;
            round.totalXBetAmount += msg.value;
            xParticipants[roundId].push(msg.sender);
        } else {
            yBets[roundId][msg.sender] += msg.value;
            round.totalYBetAmount += msg.value;
            yParticipants[roundId].push(msg.sender);
        }
        
        emit Betplaced(roundId, xOrY, msg.sender, msg.value);
    }
    
    // Resolve a specific betting round
    function resolveBetRound(uint256 roundId, uint8 state, bytes32 merkleRoot)
        external roundExists(roundId)
                 onlyCreator(roundId) 
                 roundActive(roundId)
                 finishingState(state) {
        BetRound storage round = betRounds[roundId];
        round.endTime = block.timestamp;
        round.betState = state;
        
        merkleRoots[roundId] = merkleRoot;

        emit BetRoundEnded(roundId, round.description, state);
    }

    // Get bet round information
    function getBetRoundInfo(uint256 roundId) external view roundExists(roundId) returns (
        BetRound memory
    ) {
        BetRound memory round = betRounds[roundId];

        return BetRound(
            round.description,
            round.startTime,
            round.endTime,
            round.totalXBetAmount,
            round.totalYBetAmount,
            round.creatorFee,
            round.creator,
            round.betState
        );
    }
    
    // Get total number of rounds
    function getTotalRounds() external view returns (uint256) {
        return nextRoundId;
    }

    // Get Merkle root for a round
    function getMerkleRoot(uint256 roundId) external view roundExists(roundId) returns (bytes32) {
        return merkleRoots[roundId];
    }

    // Check if a win has been claimed
    function hasClaimedWin(uint256 roundId, address winner) external view roundExists(roundId) returns (bool) {
        return claimedWins[roundId][winner];
    }

    // Claim win using Merkle proof
    function claimWin(uint256 roundId, uint256 sentAmount, bytes32[] calldata proof) 
        external roundExists(roundId) 
                 roundEnded(roundId)
                 proofIsCorrect(roundId, sentAmount, proof)
                 winHasNotBeenClaimed(roundId, msg.sender) {
        // Validate that the win amount doesn't exceed the available pool
        BetRound memory round = betRounds[roundId];
        
        // Use PRBMath for precise fee calculation
        UD60x18 totalPoolUD = ud(round.totalXBetAmount + round.totalYBetAmount);
        UD60x18 totalXBetAmountUD = ud(round.totalXBetAmount);
        UD60x18 creatorFeeUD = convert(round.creatorFee);
        UD60x18 creatorFeeAmountUD = totalPoolUD.div(creatorFeeUD);
        UD60x18 sentAmountUD = ud(sentAmount);
        // Calculate creator fee amount using PRBMath
        uint256 calculatedWinAmount = (sentAmountUD.mul(totalPoolUD.sub(creatorFeeAmountUD).div(totalXBetAmountUD))).unwrap();
        
        // Transfer the win amount
        (bool sent, ) = msg.sender.call{value: calculatedWinAmount}("");
        if (!sent) {
            revert("Win has not been sent");
        }
        // Mark as claimed
        claimedWins[roundId][msg.sender] = true;

        emit WinClaimed(roundId, msg.sender, calculatedWinAmount);
    }
/*
    // Claim win using Merkle proof
    function claimFee(uint256 roundId) 
        external roundExists(roundId) 
                 roundEnded(roundId)
                 onlyCreator(roundId)
                 feeHasNotBeenClaimed(roundId) {
        // Validate that the win amount doesn't exceed the available pool
        BetRound memory round = betRounds[roundId];
        
        // Use PRBMath for precise fee calculation
        UD60x18 totalPoolUD = convert(round.totalXBetAmount + round.totalYBetAmount);
        UD60x18 creatorFeeUD = convert(round.creatorFee);
        UD60x18 creatorFeeAmount = totalPoolUD.div(creatorFeeUD);
        // Transfer the win amount
        (bool sent, ) = msg.sender.call{value: convert(creatorFeeAmount)}("");
        if (!sent) {
            revert("Win has not been sent");
        }
        // Mark as claimed
        claimedFees[roundId] = true;

        emit FeeClaimed(roundId, msg.sender, convert(creatorFeeAmount));
    }
*/
}
