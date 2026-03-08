// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GemBotsNFAv2
 * @notice GemBots Arena NFA (Non-Fungible Agent) v2
 *   - Paid mint (0.1 BNB default)
 *   - Genesis Collection (max 100, owner-only, free)
 *   - Owner withdraw
 */
contract GemBotsNFAv2 is ERC721, ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    uint256 public mintFee = 0.1 ether; // 0.1 BNB
    uint256 public constant GENESIS_MAX = 100;
    uint256 public genesisCount;

    mapping(uint256 => bool) public isGenesis;
    mapping(uint256 => string) public botStrategy;

    event Minted(address indexed owner, uint256 indexed tokenId, bool genesis);
    event MintFeeUpdated(uint256 oldFee, uint256 newFee);

    constructor() ERC721("GemBots NFA", "GBNFA") Ownable(msg.sender) {}

    /**
     * @notice Public paid mint
     */
    function mint(string memory uri, string memory strategy) external payable returns (uint256) {
        require(msg.value >= mintFee, "Insufficient BNB for mint");

        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, uri);
        botStrategy[tokenId] = strategy;

        emit Minted(msg.sender, tokenId, false);
        return tokenId;
    }

    /**
     * @notice Owner-only free Genesis mint
     */
    function mintGenesis(
        address to,
        string memory uri,
        string memory strategy
    ) external onlyOwner returns (uint256) {
        require(genesisCount < GENESIS_MAX, "Genesis limit reached");

        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        botStrategy[tokenId] = strategy;
        isGenesis[tokenId] = true;
        genesisCount++;

        emit Minted(to, tokenId, true);
        return tokenId;
    }

    /**
     * @notice Batch Genesis mint (owner-only)
     */
    function batchMintGenesis(
        address to,
        string[] memory uris,
        string[] memory strategies
    ) external onlyOwner returns (uint256[] memory) {
        require(uris.length == strategies.length, "Arrays length mismatch");
        require(genesisCount + uris.length <= GENESIS_MAX, "Exceeds Genesis limit");

        uint256[] memory tokenIds = new uint256[](uris.length);

        for (uint256 i = 0; i < uris.length; i++) {
            uint256 tokenId = _nextTokenId++;
            _safeMint(to, tokenId);
            _setTokenURI(tokenId, uris[i]);
            botStrategy[tokenId] = strategies[i];
            isGenesis[tokenId] = true;
            genesisCount++;
            tokenIds[i] = tokenId;

            emit Minted(to, tokenId, true);
        }

        return tokenIds;
    }

    /**
     * @notice Update mint fee
     */
    function setMintFee(uint256 newFee) external onlyOwner {
        emit MintFeeUpdated(mintFee, newFee);
        mintFee = newFee;
    }

    /**
     * @notice Withdraw collected BNB
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No BNB to withdraw");
        (bool sent, ) = payable(owner()).call{value: balance}("");
        require(sent, "Withdraw failed");
    }

    /**
     * @notice Total supply
     */
    function totalSupply() external view returns (uint256) {
        return _nextTokenId;
    }

    // Accept BNB
    receive() external payable {}

    // Required overrides
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
