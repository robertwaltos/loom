// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title  WitnessRegistry
 * @notice On-chain attestation registry for Koydo's Permanence Protocol.
 *
 * Off-chain the TypeScript layer hashes individual records and builds a Merkle
 * tree over each batch.  Only the Merkle root is written here — a gas-efficient
 * design that lets anyone prove a record was attested without reading it all.
 *
 * Record types: dynasty-founding, world-milestone, player-milestone,
 *               ceremony-attestation, heirloom-creation, territory-claim,
 *               treaty-signed, war-declared, era-transition
 *
 * Deployment target: Ethereum L2 (Optimism / Arbitrum / Base)
 */
contract WitnessRegistry {
    // ─── Types ────────────────────────────────────────────────────────────────

    struct BatchRecord {
        bytes32 merkleRoot;
        uint40  submittedAt;
        uint32  entryCount;
        string  recordType;   // e.g. "dynasty-founding"
        string  metadataUri;  // IPFS or HTTPS pointer to full batch JSON
    }

    // ─── Storage ──────────────────────────────────────────────────────────────

    // batchId → record
    mapping(bytes32 => BatchRecord) private _batches;
    bytes32[] private _batchIds;

    // access control
    address public admin;
    mapping(address => bool) public isSubmitter;

    uint256 public constant MAX_ENTRY_COUNT = 10_000;

    // ─── Events ───────────────────────────────────────────────────────────────

    event BatchSubmitted(
        bytes32 indexed batchId,
        bytes32 indexed merkleRoot,
        string          recordType,
        uint32          entryCount,
        uint40          submittedAt
    );

    event SubmitterAdded(address indexed submitter);
    event SubmitterRemoved(address indexed submitter);
    event AdminTransferred(address indexed previous, address indexed next);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error Unauthorized();
    error ZeroAddress();
    error BatchAlreadyExists(bytes32 batchId);
    error EmptyBatch();
    error TooManyEntries(uint32 provided, uint256 max);
    error InvalidMerkleRoot();
    error EmptyRecordType();

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address admin_) {
        if (admin_ == address(0)) revert ZeroAddress();
        admin = admin_;
        isSubmitter[admin_] = true;
    }

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyAdmin() {
        if (msg.sender != admin) revert Unauthorized();
        _;
    }

    modifier onlySubmitter() {
        if (!isSubmitter[msg.sender]) revert Unauthorized();
        _;
    }

    // ─── Submission ───────────────────────────────────────────────────────────

    /**
     * @notice Submit a new batch of attested records.
     * @param batchId     Unique identifier (e.g. keccak256 of batch JSON)
     * @param merkleRoot  Root of the off-chain Merkle tree over record hashes
     * @param recordType  String category tag (e.g. "dynasty-founding")
     * @param entryCount  Number of records in the batch (stored for audits)
     * @param metadataUri IPFS CID or HTTPS URL pointing to full batch data
     */
    function submitBatch(
        bytes32        batchId,
        bytes32        merkleRoot,
        string calldata recordType,
        uint32         entryCount,
        string calldata metadataUri
    ) external onlySubmitter {
        if (merkleRoot == bytes32(0))     revert InvalidMerkleRoot();
        if (entryCount == 0)             revert EmptyBatch();
        if (bytes(recordType).length == 0) revert EmptyRecordType();
        if (entryCount > MAX_ENTRY_COUNT) revert TooManyEntries(entryCount, MAX_ENTRY_COUNT);
        if (_batches[batchId].submittedAt != 0) revert BatchAlreadyExists(batchId);

        uint40 now_ = uint40(block.timestamp);

        _batches[batchId] = BatchRecord({
            merkleRoot:  merkleRoot,
            submittedAt: now_,
            entryCount:  entryCount,
            recordType:  recordType,
            metadataUri: metadataUri
        });
        _batchIds.push(batchId);

        emit BatchSubmitted(batchId, merkleRoot, recordType, entryCount, now_);
    }

    // ─── Verification ─────────────────────────────────────────────────────────

    /**
     * @notice Verify a single record leaf is included in a submitted batch.
     * @param batchId Batch to verify against
     * @param proof   Merkle proof (sibling hashes leaf → root)
     * @param leaf    keccak256 hash of the record data
     * @return true   iff the proof is valid and the batch exists
     */
    function verify(
        bytes32          batchId,
        bytes32[] calldata proof,
        bytes32          leaf
    ) external view returns (bool) {
        BatchRecord storage b = _batches[batchId];
        if (b.submittedAt == 0) return false;
        return _verifyProof(proof, b.merkleRoot, leaf);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function getBatch(bytes32 batchId) external view returns (BatchRecord memory) {
        return _batches[batchId];
    }

    function batchCount() external view returns (uint256) {
        return _batchIds.length;
    }

    function getBatchIdAt(uint256 index) external view returns (bytes32) {
        return _batchIds[index];
    }

    function batchExists(bytes32 batchId) external view returns (bool) {
        return _batches[batchId].submittedAt != 0;
    }

    // ─── Access control ───────────────────────────────────────────────────────

    function addSubmitter(address submitter) external onlyAdmin {
        if (submitter == address(0)) revert ZeroAddress();
        isSubmitter[submitter] = true;
        emit SubmitterAdded(submitter);
    }

    function removeSubmitter(address submitter) external onlyAdmin {
        isSubmitter[submitter] = false;
        emit SubmitterRemoved(submitter);
    }

    function transferAdmin(address newAdmin) external onlyAdmin {
        if (newAdmin == address(0)) revert ZeroAddress();
        emit AdminTransferred(admin, newAdmin);
        admin = newAdmin;
    }

    // ─── Internal: Merkle proof ───────────────────────────────────────────────

    /**
     * @dev Standard OpenZeppelin-compatible Merkle proof verification.
     *      Pairs are sorted (smaller first) to match the off-chain builder.
     */
    function _verifyProof(
        bytes32[] calldata proof,
        bytes32 root,
        bytes32 leaf
    ) private pure returns (bool) {
        bytes32 computed = leaf;
        for (uint256 i = 0; i < proof.length; ++i) {
            bytes32 sibling = proof[i];
            if (computed <= sibling) {
                computed = keccak256(abi.encodePacked(computed, sibling));
            } else {
                computed = keccak256(abi.encodePacked(sibling, computed));
            }
        }
        return computed == root;
    }
}
