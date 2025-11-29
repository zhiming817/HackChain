// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title NFTTicket
 * @dev NFT ticket contract for hackathon events on Somnia blockchain
 */

contract NFTTicket is ERC721, Ownable {
    using Counters for Counters.Counter;

    // Ticket structure
    struct Ticket {
        uint256 tokenId;
        uint256 eventId;
        address holder;
        string eventTitle;
        string location;
        uint256 startTime;
        uint256 endTime;
        bool used;
        uint256 issuedAt;
    }

    // State variables
    mapping(uint256 => Ticket) public tickets;
    mapping(uint256 => mapping(address => bool)) public eventTicketHolders;
    
    Counters.Counter private tokenIdCounter;
    address public hackathonContract;

    // Events
    event TicketIssued(uint256 indexed tokenId, uint256 indexed eventId, address indexed holder);
    event TicketUsed(uint256 indexed tokenId);
    event TicketTransferred(uint256 indexed tokenId, address indexed from, address indexed to);

    // Modifiers
    modifier onlyHackathonContract() {
        require(msg.sender == hackathonContract, "Only hackathon contract can call this");
        _;
    }

    // Constructor
    constructor(address _hackathonContract) ERC721("Hackathon Ticket", "HKTN") {
        hackathonContract = _hackathonContract;
    }

    /**
     * @dev Issue a new ticket NFT
     */
    function issueTicket(
        uint256 _eventId,
        address _holder,
        string memory _eventTitle,
        string memory _location,
        uint256 _startTime,
        uint256 _endTime
    ) public onlyHackathonContract returns (uint256) {
        uint256 tokenId = tokenIdCounter.current();
        tokenIdCounter.increment();

        _safeMint(_holder, tokenId);

        tickets[tokenId] = Ticket({
            tokenId: tokenId,
            eventId: _eventId,
            holder: _holder,
            eventTitle: _eventTitle,
            location: _location,
            startTime: _startTime,
            endTime: _endTime,
            used: false,
            issuedAt: block.timestamp
        });

        eventTicketHolders[_eventId][_holder] = true;

        emit TicketIssued(tokenId, _eventId, _holder);
        return tokenId;
    }

    /**
     * @dev Mark a ticket as used (checked in)
     */
    function useTicket(uint256 _tokenId) public onlyHackathonContract {
        require(_exists(_tokenId), "Ticket does not exist");
        require(!tickets[_tokenId].used, "Ticket already used");

        tickets[_tokenId].used = true;
        emit TicketUsed(_tokenId);
    }

    /**
     * @dev Get ticket details
     */
    function getTicket(uint256 _tokenId) public view returns (Ticket memory) {
        require(_exists(_tokenId), "Ticket does not exist");
        return tickets[_tokenId];
    }

    /**
     * @dev Check if a ticket is valid
     */
    function isTicketValid(uint256 _tokenId) public view returns (bool) {
        if (!_exists(_tokenId)) return false;
        
        Ticket memory ticket = tickets[_tokenId];
        return !ticket.used && block.timestamp >= ticket.startTime && block.timestamp <= ticket.endTime;
    }

    /**
     * @dev Check if an address holds a ticket for an event
     */
    function hasTicket(uint256 _eventId, address _holder) public view returns (bool) {
        return eventTicketHolders[_eventId][_holder];
    }

    /**
     * @dev Override transfer to emit custom event
     */
    function transferFrom(address from, address to, uint256 tokenId) public override {
        super.transferFrom(from, to, tokenId);
        emit TicketTransferred(tokenId, from, to);
    }

    /**
     * @dev Override safeTransferFrom to emit custom event
     */
    function safeTransferFrom(address from, address to, uint256 tokenId) public override {
        super.safeTransferFrom(from, to, tokenId);
        emit TicketTransferred(tokenId, from, to);
    }

    /**
     * @dev Check if token exists
     */
    function _exists(uint256 tokenId) internal view override returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    /**
     * @dev Set hackathon contract address (only owner)
     */
    function setHackathonContract(address _hackathonContract) public onlyOwner {
        hackathonContract = _hackathonContract;
    }
}
