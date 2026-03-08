// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title GemBotsBetting
 * @author GemBots Arena Team
 * @notice AI vs AI battle betting on BNB Chain.
 *         Players create 1v1 battle rooms, deposit BNB entry fees,
 *         and an oracle resolves the winner after LLM prediction battles.
 * @dev Uses OpenZeppelin Ownable + ReentrancyGuard.
 *      Platform fee is deducted from the pot on resolution.
 */
contract GemBotsBetting is Ownable, ReentrancyGuard {
    // ──────────────────────────────────────────────
    //  Enums & Structs
    // ──────────────────────────────────────────────

    enum BattleStatus {
        Open,       // Created, waiting for joiner
        Active,     // Both players joined, battle in progress
        Resolved,   // Winner declared, funds distributed
        Cancelled   // Creator cancelled before anyone joined
    }

    struct Battle {
        uint256 id;
        address creator;
        address joiner;
        uint256 entryFee;
        BattleStatus status;
        address winner;
        uint256 createdAt;
        uint256 resolvedAt;
    }

    // ──────────────────────────────────────────────
    //  Constants
    // ──────────────────────────────────────────────

    uint256 public constant MIN_ENTRY_FEE = 0.001 ether;  // 0.001 BNB
    uint256 public constant MAX_ENTRY_FEE = 100 ether;    // 100 BNB
    uint256 public constant MAX_PLATFORM_FEE = 1000;       // 10% in basis points

    // ──────────────────────────────────────────────
    //  State
    // ──────────────────────────────────────────────

    address public oracle;
    uint256 public platformFeeBps = 250;   // 2.5% default
    uint256 public platformBalance;         // Accumulated platform fees
    uint256 public nextBattleId;

    mapping(uint256 => Battle) public battles;

    // ──────────────────────────────────────────────
    //  Events
    // ──────────────────────────────────────────────

    event BattleCreated(
        uint256 indexed battleId,
        address indexed creator,
        uint256 entryFee
    );

    event BattleJoined(
        uint256 indexed battleId,
        address indexed joiner
    );

    event BattleResolved(
        uint256 indexed battleId,
        address indexed winner,
        uint256 payout,
        uint256 platformFee
    );

    event BattleCancelled(
        uint256 indexed battleId,
        address indexed creator,
        uint256 refundAmount
    );

    event OracleUpdated(address indexed oldOracle, address indexed newOracle);
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    event EmergencyWithdraw(address indexed to, uint256 amount);

    // ──────────────────────────────────────────────
    //  Modifiers
    // ──────────────────────────────────────────────

    modifier onlyOracle() {
        require(msg.sender == oracle, "GemBots: caller is not the oracle");
        _;
    }

    // ──────────────────────────────────────────────
    //  Constructor
    // ──────────────────────────────────────────────

    /**
     * @param _oracle Address of the backend oracle service.
     */
    constructor(address _oracle) Ownable(msg.sender) {
        require(_oracle != address(0), "GemBots: oracle is zero address");
        oracle = _oracle;
    }

    // ──────────────────────────────────────────────
    //  Battle Lifecycle
    // ──────────────────────────────────────────────

    /**
     * @notice Create a new battle room by depositing an entry fee in BNB.
     * @return battleId The ID of the newly created battle.
     */
    function createBattle() external payable nonReentrant returns (uint256 battleId) {
        require(msg.value >= MIN_ENTRY_FEE, "GemBots: entry fee too low");
        require(msg.value <= MAX_ENTRY_FEE, "GemBots: entry fee too high");

        battleId = nextBattleId++;

        battles[battleId] = Battle({
            id: battleId,
            creator: msg.sender,
            joiner: address(0),
            entryFee: msg.value,
            status: BattleStatus.Open,
            winner: address(0),
            createdAt: block.timestamp,
            resolvedAt: 0
        });

        emit BattleCreated(battleId, msg.sender, msg.value);
    }

    /**
     * @notice Join an existing open battle. Must send exactly the same entry fee.
     * @param _battleId The battle to join.
     */
    function joinBattle(uint256 _battleId) external payable nonReentrant {
        Battle storage b = battles[_battleId];

        require(b.creator != address(0), "GemBots: battle does not exist");
        require(b.status == BattleStatus.Open, "GemBots: battle is not open");
        require(msg.sender != b.creator, "GemBots: cannot join own battle");
        require(msg.value == b.entryFee, "GemBots: entry fee mismatch");

        b.joiner = msg.sender;
        b.status = BattleStatus.Active;

        emit BattleJoined(_battleId, msg.sender);
    }

    /**
     * @notice Resolve a battle. Only the oracle can call this.
     *         Pays the winner (pot minus platform fee).
     * @param _battleId The battle to resolve.
     * @param _winner   Address of the winner (must be creator or joiner).
     */
    function resolveBattle(uint256 _battleId, address _winner) external onlyOracle nonReentrant {
        Battle storage b = battles[_battleId];

        require(b.creator != address(0), "GemBots: battle does not exist");
        require(b.status == BattleStatus.Active, "GemBots: battle is not active");
        require(
            _winner == b.creator || _winner == b.joiner,
            "GemBots: winner must be a participant"
        );

        // Calculate payouts
        uint256 totalPot = b.entryFee * 2;
        uint256 fee = (totalPot * platformFeeBps) / 10000;
        uint256 payout = totalPot - fee;

        // Update state before transfers (checks-effects-interactions)
        b.status = BattleStatus.Resolved;
        b.winner = _winner;
        b.resolvedAt = block.timestamp;
        platformBalance += fee;

        // Transfer winnings
        (bool success, ) = payable(_winner).call{value: payout}("");
        require(success, "GemBots: payout transfer failed");

        emit BattleResolved(_battleId, _winner, payout, fee);
    }

    /**
     * @notice Cancel an open battle. Only the creator can cancel, and only
     *         if no one has joined yet. Refunds the entry fee.
     * @param _battleId The battle to cancel.
     */
    function cancelBattle(uint256 _battleId) external nonReentrant {
        Battle storage b = battles[_battleId];

        require(b.creator != address(0), "GemBots: battle does not exist");
        require(b.status == BattleStatus.Open, "GemBots: battle is not open");
        require(msg.sender == b.creator, "GemBots: only creator can cancel");

        uint256 refundAmount = b.entryFee;

        // Update state before transfer
        b.status = BattleStatus.Cancelled;

        // Refund
        (bool success, ) = payable(b.creator).call{value: refundAmount}("");
        require(success, "GemBots: refund transfer failed");

        emit BattleCancelled(_battleId, b.creator, refundAmount);
    }

    // ──────────────────────────────────────────────
    //  Admin Functions
    // ──────────────────────────────────────────────

    /**
     * @notice Set the oracle address. Only owner.
     * @param _oracle New oracle address.
     */
    function setOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "GemBots: oracle is zero address");
        address oldOracle = oracle;
        oracle = _oracle;
        emit OracleUpdated(oldOracle, _oracle);
    }

    /**
     * @notice Set the platform fee in basis points. Only owner. Max 10%.
     * @param _feeBps New fee in basis points (e.g. 250 = 2.5%).
     */
    function setPlatformFee(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= MAX_PLATFORM_FEE, "GemBots: fee exceeds 10%");
        uint256 oldFee = platformFeeBps;
        platformFeeBps = _feeBps;
        emit PlatformFeeUpdated(oldFee, _feeBps);
    }

    /**
     * @notice Withdraw accumulated platform fees to owner. Only owner.
     */
    function withdrawPlatformFees() external onlyOwner nonReentrant {
        uint256 amount = platformBalance;
        require(amount > 0, "GemBots: no fees to withdraw");

        platformBalance = 0;

        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "GemBots: withdrawal failed");
    }

    /**
     * @notice Emergency withdraw all BNB from the contract. Only owner.
     *         Use only in critical situations (e.g. exploit discovered).
     */
    function emergencyWithdraw() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "GemBots: nothing to withdraw");

        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "GemBots: emergency withdrawal failed");

        emit EmergencyWithdraw(owner(), balance);
    }

    // ──────────────────────────────────────────────
    //  View Functions
    // ──────────────────────────────────────────────

    /**
     * @notice Get the accumulated platform fee balance.
     */
    function getPlatformBalance() external view returns (uint256) {
        return platformBalance;
    }

    /**
     * @notice Get full battle details.
     */
    function getBattle(uint256 _battleId) external view returns (Battle memory) {
        require(battles[_battleId].creator != address(0), "GemBots: battle not found");
        return battles[_battleId];
    }

    /**
     * @notice Get total number of battles created.
     */
    function getBattleCount() external view returns (uint256) {
        return nextBattleId;
    }

    // ──────────────────────────────────────────────
    //  Fallback — reject random BNB
    // ──────────────────────────────────────────────

    receive() external payable {
        revert("GemBots: use createBattle or joinBattle");
    }

    fallback() external payable {
        revert("GemBots: invalid call");
    }
}
