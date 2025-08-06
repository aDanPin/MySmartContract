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

    struct Win {
        uint256 betId;
        uint256 win;
        bool completed;
    }

    mapping(uint256 => mapping(address => uint256)) internal xBets; // betId => Address => amount bet on X
    mapping(uint256 => mapping(address => uint256)) internal yBets; // betId => Address => amount bet on Y
    mapping(uint256 => address[]) internal xParticipants; // betId => Address
    mapping(uint256 => address[]) internal yParticipants; // betId => Address
    mapping(address => Win[]) winners;


    // Bet rounds tracking
    mapping(uint256 => BetRound) internal betRounds;
    uint256 internal nextRoundId = 0;
    
    // Events
    event BetRoundCreated(uint256 indexed roundId, bytes32 indexed description);
    event BetRoundEnded(uint256 indexed roundId, bytes32 indexed description, uint8 indexed betState);
    
    modifier onlyCreator(uint256 roundId) {
        require(betRounds[roundId].creator == msg.sender, "Only creator can call this function");
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
        newRound.creatorFee = creatorsFee;

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
        external onlyCreator(roundId) 
                 roundExists(roundId)
                 roundActive(roundId)
                 finishingState(state) {
        BetRound storage round = betRounds[roundId];
        round.endTime = block.timestamp;
        round.betState = state;
        
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
        uint256 betScale = (SCALE * winningPool) / betRound.totalXBetAmount;

        address[] storage winnersPool = xParticipants[roundId];
        for (uint i = 0; i < winnersPool.length; i++) {
            address winner = winnersPool[i];
            uint256 win = xBets[roundId][winner] * betScale / SCALE;
            // SCALE ENDS HERE
            if (sentAmount + win < winningPool) {
                winners[winner].push(Win(roundId, win, false));
            }
            else {
                // todo:: Error handle
            }
        }

        creatorFeeAmount = betAmount - sentAmount;
        if (creatorFeeAmount >= 0) {
            winners[betRound.creator].push(Win(roundId, creatorFeeAmount, false));
        }
        else {
            // todo:: Error handle
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
        uint256 betScale = (SCALE * winningPool) / betRound.totalYBetAmount;

        address[] storage winnersPool = yParticipants[roundId];
        for (uint i = 0; i < winnersPool.length; i++) {
            address winner = winnersPool[i];
            uint256 win = yBets[roundId][winner] * betScale / SCALE;
            // SCALE ENDS HERE
            if (sentAmount + win < winningPool) {
                winners[winner].push(Win(roundId, win, false));
            }
            else {
                // todo:: Error handle
            }
        }

        creatorFeeAmount = betAmount - sentAmount;
        if (creatorFeeAmount >= 0) {
            winners[betRound.creator].push(Win(roundId, creatorFeeAmount, false));
        }
        else {
            // todo:: Error handle
        }
    }

    // Get bet round information
    function getBetRoundInfo(uint256 roundId) external view roundExists(roundId) returns (
        BetRound memory
    ) {
        BetRound storage round = betRounds[roundId];

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
        return nextRoundId - 1;
    }
}
