// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract Bet {    
    uint256 public SCALE = 1000;
  
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

    // Bet rounds tracking
    mapping(uint256 => BetRound) internal betRounds;
    uint256[] internal activeRoundIds;
    uint256 internal nextRoundId = 0;
    
    // Events
    event BetRoundCreated(uint256 indexed roundId, bytes32 indexed description);
    event BetRoundEnded(uint256 indexed roundId, bytes32 indexed description, uint8 indexed betState);
    
    modifier onlyCreator(BetRound calldata betRound, address caller) {
        require(betRound.creator == caller, "Only creator can call this function");
        _;
    }
    
    modifier roundExists(uint256 roundId) {
        require(roundId < nextRoundId, "Bet round does not exist");
        _;
    }
    
    modifier roundActive(uint256 roundId) {
        require(betRounds[roundId].betState != 0, "Betting period has ended"); // startTime is a time of creation BetRound so we need to check only endTime
        _;
    }
    
    modifier roundEnded(uint256 roundId) {
        BetRound storage round = betRounds[roundId];
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
                state == 5, "Bet is still active");
        _;
    }

    modifier newIdAvailable() {
        require(nextRoundId <= type(uint256).max, "Maximum bet rounds number had reached");
        _;
    }

    // Create a new betting round
    function createBetRound(
        bytes32 description, uint creatorsFee
    ) external newIdAvailable returns (uint256 roundId) {
        roundId = nextRoundId++;
        
        BetRound storage newRound = betRounds[roundId];
        newRound.description = description;
        newRound.startTime = block.timestamp;
        newRound.betState = 1;
        
        activeRoundIds.push(roundId);
        
        emit BetRoundCreated(roundId, description);
        
        return roundId;
    }
    
    // Place a bet on a specific round
    // xOrY : 0 = x, 1 = y
    function placeBet(uint256 roundId, uint8 xOrY) external payable roundExists(roundId) roundActive(roundId) {
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
        
        // todo: emit BetPlaced(roundId, msg.sender, option, msg.value);
    }
    
    // Resolve a specific betting round
    function resolveBetRound(uint256 roundId, uint8 state)
        external onlyCreator 
                 roundExists(roundId)
                 roundActive(roundId)
                 finishingState(state) {
        BetRound storage round = betRounds[roundId];
        round.endTime = block.timestamp;
        round.state = state;
        
        if(state == 2) { // cancel

        }
        else if (state == 3) { // xWin

        }
        else if (state == 4) { // yWin
            
        }
        else if (state == 5) { // draw
            
        }

        emit BetRoundEnded(roundId, round.description, state);
    }
    
    // Claim winnings for a specific round
    function claimXandCreator(uint256 roundId) internal roundExists(roundId) {
        BetRound storage betRound = betRounds[roundId];

        uint256 betAmount = betRound.totalXBetAmount + betRound.totalYBetAmount;
        require(betAmount > 0, "No bet placed on winning option");

        // Calculate winnings based on total pool and creator fee
        uint256 creatorFeeAmount = betAmount / betRound.creatorFee;
        uint256 winningPool = betAmount - creatorFeeAmount;
        uint256 sentAmount = 0;
        
        // SCALE STARTS HERE
        uint256 betScale = (SCALE * betAmount) / betRound.totalXBetAmount;

        address[] storage winnersPool = xParticipants[roundId];
        for (uint i = 0; i < winnersPool.length; i++) {
            address winner = winnersPool[i];
            uint256 win = xBets[roundId][winner] * betScale / SCALE;
            // SCALE ENDS HERE
            (bool sent, bytes memory data) = winner.call{value: win}("");
            if (sent) {
                sentAmount += win;
            }
            else {
                // TODO: error handle
            }
        }

        creatorFeeAmount = betAmount - sentAmount;
        (bool creatorSent, bytes memory creatorData) = betRound.creator.call{value: creatorFeeAmount}("");
        if (!creatorSent) {
            // TODO: error handle
        }
    }

    // Claim winnings for a specific round
    function claimYandCreator(uint256 roundId) internal roundExists(roundId) {
        BetRound storage betRound = betRounds[roundId];

        uint256 betAmount = betRound.totalXBetAmount + betRound.totalYBetAmount;
        require(betAmount > 0, "No bet placed on winning option");

        // Calculate winnings based on total pool and creator fee
        uint256 creatorFeeAmount = betAmount / betRound.creatorFee;
        uint256 winningPool = betAmount - creatorFeeAmount;
        uint256 sentAmount = 0;
        
        // SCALE STARTS HERE
        uint256 betScale = (SCALE * betAmount) / betRound.totalYBetAmount;

        address[] storage winnersPool = xParticipants[roundId];
        for (uint i = 0; i < winnersPool.length; i++) {
            address winner = winnersPool[i];
            uint256 win = yBets[roundId][winner] * betScale / SCALE;
            // SCALE ENDS HERE
            (bool sent, bytes memory data) = winner.call{value: win}("");
            if (sent) {
                sentAmount += win;
            }
            else {
                // TODO: error handle
            }
        }

        creatorFeeAmount = betAmount - sentAmount;
        (bool creatorSent, bytes memory creatorData) = betRound.creator.call{value: creatorFeeAmount}("");
        if (!creatorSent) {
            // TODO: error handle
        }
    }

    // Get bet round information
    function getBetRoundInfo(uint256 roundId) external view roundExists(roundId) returns (
        Bet bet
    ) {
        BetRound storage round = betRounds[roundId];
        return (
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
    
    // Get all active round IDs
    function getActiveRoundIds() external view returns (uint256[] memory) {
        return activeRoundIds;
    }
    
    // Get total number of rounds
    function getTotalRounds() external view returns (uint256) {
        return nextRoundId - 1;
    }
    
    // Helper function to remove round from active rounds
    function _removeFromActiveRounds(uint256 roundId) internal {
        for (uint256 i = 0; i < activeRoundIds.length; i++) {
            if (activeRoundIds[i] == roundId) {
                activeRoundIds[i] = activeRoundIds[activeRoundIds.length - 1];
                activeRoundIds.pop();
                break;
            }
        }
    }
    
    // Check if user has claimed winnings for a round
    function hasClaimedWinnings(uint256 roundId, address user) external view roundExists(roundId) returns (bool) {
        return betRounds[roundId].hasClaimedWinnings[user];
    }
}
