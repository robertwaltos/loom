// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title  PermanenceCovenant
 * @notice The Concord's on-chain guarantee that Koydo will never simply vanish.
 *
 * When the studio faces a Tier 4 financial crisis this contract advances
 * through a one-way state machine:
 *
 *   DORMANT → MONITORING → ACTIVATED → COUNTDOWN (30 days)
 *     → SOURCE_RELEASED → COMMUNITY_HANDED → PRESERVED
 *
 * Once ACTIVATED the countdown cannot be reversed.  Any wallet can read the
 * current state; only the owner (multisig) may advance it.
 *
 * Deployment target: Ethereum L2 (Optimism / Arbitrum / Base)
 */
contract PermanenceCovenant {
    // ─── State ────────────────────────────────────────────────────────────────

    enum Status {
        DORMANT,           // 0 — default, studio operating normally
        MONITORING,        // 1 — early-warning indicators tripped
        ACTIVATED,         // 2 — Tier 4 crisis confirmed, covenant live
        COUNTDOWN,         // 3 — 30-day countdown started
        SOURCE_RELEASED,   // 4 — source code deposited to public escrow
        COMMUNITY_HANDED,  // 5 — governance transferred to DAO
        PRESERVED          // 6 — terminal: world permanently archived
    }

    struct CovenantState {
        Status  status;
        uint40  activatedAt;          // unix timestamp
        uint40  countdownEndsAt;      // activatedAt + 30 days
        uint40  lastTransitionAt;
        address communityGovernance;  // DAO address (set at COMMUNITY_HANDED)
        string  sourceEscrowUrl;      // IPFS CID or HTTPS URL
        string  archiveUrl;           // Permanent archive URL
        string  evidence;             // Human-readable trigger evidence
    }

    CovenantState private _state;
    address public  owner;

    uint40 public constant COUNTDOWN_DURATION = 30 days;

    // ─── Events ───────────────────────────────────────────────────────────────

    event StatusAdvanced(
        Status  indexed from,
        Status  indexed to,
        uint40          at,
        string          evidence
    );

    event OwnershipTransferred(address indexed previous, address indexed next);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error Unauthorized();
    error InvalidTransition(Status current, Status attempted);
    error CountdownNotExpired(uint40 endsAt, uint40 now_);
    error ZeroAddress();

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address owner_) {
        if (owner_ == address(0)) revert ZeroAddress();
        owner = owner_;
        _state.status = Status.DORMANT;
        _state.lastTransitionAt = uint40(block.timestamp);
    }

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    // ─── State transitions ────────────────────────────────────────────────────

    /// @notice Begin monitoring — studio enters early-warning mode.
    function beginMonitoring(string calldata evidence) external onlyOwner {
        _requireStatus(Status.DORMANT, Status.MONITORING);
        _advance(Status.MONITORING, evidence);
    }

    /// @notice Formally activate the covenant — Tier 4 crisis confirmed.
    function activate(string calldata evidence) external onlyOwner {
        _requireStatus(Status.MONITORING, Status.ACTIVATED);
        _advance(Status.ACTIVATED, evidence);
    }

    /// @notice Start the 30-day countdown.
    function startCountdown(string calldata evidence) external onlyOwner {
        _requireStatus(Status.ACTIVATED, Status.COUNTDOWN);
        _state.countdownEndsAt = uint40(block.timestamp) + COUNTDOWN_DURATION;
        _advance(Status.COUNTDOWN, evidence);
    }

    /// @notice Record public escrow URL for the source code release.
    function releaseSourceCode(
        string calldata escrowUrl,
        string calldata evidence
    ) external onlyOwner {
        _requireStatus(Status.COUNTDOWN, Status.SOURCE_RELEASED);
        if (bytes(escrowUrl).length == 0) revert InvalidTransition(_state.status, Status.SOURCE_RELEASED);
        if (block.timestamp < _state.countdownEndsAt) {
            revert CountdownNotExpired(_state.countdownEndsAt, uint40(block.timestamp));
        }
        _state.sourceEscrowUrl = escrowUrl;
        _advance(Status.SOURCE_RELEASED, evidence);
    }

    /// @notice Hand governance to the community DAO.
    function handToCommunity(
        address daoAddress,
        string calldata evidence
    ) external onlyOwner {
        _requireStatus(Status.SOURCE_RELEASED, Status.COMMUNITY_HANDED);
        if (daoAddress == address(0)) revert ZeroAddress();
        _state.communityGovernance = daoAddress;
        _advance(Status.COMMUNITY_HANDED, evidence);
    }

    /// @notice Mark the world as permanently archived. Terminal state.
    function archiveAndPreserve(
        string calldata archiveUrl,
        string calldata evidence
    ) external onlyOwner {
        _requireStatus(Status.COMMUNITY_HANDED, Status.PRESERVED);
        _state.archiveUrl = archiveUrl;
        _advance(Status.PRESERVED, evidence);
        // Ownership renounced automatically when preserved
        emit OwnershipTransferred(owner, address(0));
        owner = address(0);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function getState() external view returns (CovenantState memory) {
        return _state;
    }

    function getStatus() external view returns (Status) {
        return _state.status;
    }

    function countdownSecondsRemaining() external view returns (uint256) {
        if (_state.status != Status.COUNTDOWN) return 0;
        if (block.timestamp >= _state.countdownEndsAt) return 0;
        return _state.countdownEndsAt - block.timestamp;
    }

    function isActivated() external view returns (bool) {
        return uint8(_state.status) >= uint8(Status.ACTIVATED);
    }

    // ─── Ownership ────────────────────────────────────────────────────────────

    /// @notice Transfer ownership to a multisig or new address.
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    function _requireStatus(Status expected, Status next) private view {
        if (_state.status != expected) revert InvalidTransition(_state.status, next);
    }

    function _advance(Status next, string calldata evidence) private {
        Status prev = _state.status;
        _state.status = next;
        _state.lastTransitionAt = uint40(block.timestamp);
        _state.evidence = evidence;
        if (next == Status.ACTIVATED) {
            _state.activatedAt = uint40(block.timestamp);
        }
        emit StatusAdvanced(prev, next, uint40(block.timestamp), evidence);
    }
}
