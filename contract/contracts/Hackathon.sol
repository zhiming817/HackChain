// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/**
 * @title Hackathon
 * @dev Hackathon event management contract on Somnia blockchain
 */

contract Hackathon {
    // Event structure
    struct Event {
        uint256 id;
        address organizer;
        string title;
        string description;
        uint256 startTime;
        uint256 endTime;
        string location;
        uint256 maxParticipants;
        uint256 participantCount;
        bool active;
        uint256 createdAt;
    }

    // Participant structure
    struct Participant {
        address wallet;
        string name;
        uint256 registeredAt;
        bool checkedIn;
        uint256 checkInTime;
    }

    // Sponsor structure
    struct Sponsor {
        address wallet;
        string name;
        uint256 amount;
        uint256 sponsoredAt;
    }

    // State variables
    mapping(uint256 => Event) public events;
    mapping(uint256 => Participant[]) public eventParticipants;
    mapping(uint256 => Sponsor[]) public eventSponsors;
    mapping(uint256 => mapping(address => bool)) public isParticipant;
    mapping(uint256 => mapping(address => bool)) public isSponsor;
    
    uint256 public eventCounter;
    address public owner;

    // Events
    event EventCreated(uint256 indexed eventId, address indexed organizer, string title);
    event ParticipantRegistered(uint256 indexed eventId, address indexed participant);
    event ParticipantCheckedIn(uint256 indexed eventId, address indexed participant);
    event SponsorAdded(uint256 indexed eventId, address indexed sponsor, uint256 amount);
    event EventClosed(uint256 indexed eventId);

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier eventExists(uint256 _eventId) {
        require(_eventId < eventCounter, "Event does not exist");
        _;
    }

    modifier onlyEventOrganizer(uint256 _eventId) {
        require(msg.sender == events[_eventId].organizer, "Only event organizer can call this");
        _;
    }

    // Constructor
    constructor() {
        owner = msg.sender;
        eventCounter = 0;
    }

    /**
     * @dev Create a new hackathon event
     */
    function createEvent(
        string memory _title,
        string memory _description,
        uint256 _startTime,
        uint256 _endTime,
        string memory _location,
        uint256 _maxParticipants
    ) public returns (uint256) {
        require(_startTime < _endTime, "Start time must be before end time");
        require(_maxParticipants > 0, "Max participants must be greater than 0");

        uint256 eventId = eventCounter;
        events[eventId] = Event({
            id: eventId,
            organizer: msg.sender,
            title: _title,
            description: _description,
            startTime: _startTime,
            endTime: _endTime,
            location: _location,
            maxParticipants: _maxParticipants,
            participantCount: 0,
            active: true,
            createdAt: block.timestamp
        });

        eventCounter++;
        emit EventCreated(eventId, msg.sender, _title);
        return eventId;
    }

    /**
     * @dev Register a participant for an event
     */
    function registerParticipant(uint256 _eventId, string memory _name) public eventExists(_eventId) {
        Event storage event_ = events[_eventId];
        require(event_.active, "Event is not active");
        require(event_.participantCount < event_.maxParticipants, "Event is full");
        require(!isParticipant[_eventId][msg.sender], "Already registered");

        Participant memory participant = Participant({
            wallet: msg.sender,
            name: _name,
            registeredAt: block.timestamp,
            checkedIn: false,
            checkInTime: 0
        });

        eventParticipants[_eventId].push(participant);
        isParticipant[_eventId][msg.sender] = true;
        event_.participantCount++;

        emit ParticipantRegistered(_eventId, msg.sender);
    }

    /**
     * @dev Check in a participant
     */
    function checkInParticipant(uint256 _eventId, address _participant) public onlyEventOrganizer(_eventId) eventExists(_eventId) {
        require(isParticipant[_eventId][_participant], "Participant not registered");

        Participant[] storage participants = eventParticipants[_eventId];
        for (uint256 i = 0; i < participants.length; i++) {
            if (participants[i].wallet == _participant) {
                participants[i].checkedIn = true;
                participants[i].checkInTime = block.timestamp;
                emit ParticipantCheckedIn(_eventId, _participant);
                break;
            }
        }
    }

    /**
     * @dev Add a sponsor to an event
     */
    function addSponsor(uint256 _eventId, string memory _sponsorName) public payable eventExists(_eventId) {
        require(msg.value > 0, "Sponsorship amount must be greater than 0");
        require(!isSponsor[_eventId][msg.sender], "Already a sponsor");

        Sponsor memory sponsor = Sponsor({
            wallet: msg.sender,
            name: _sponsorName,
            amount: msg.value,
            sponsoredAt: block.timestamp
        });

        eventSponsors[_eventId].push(sponsor);
        isSponsor[_eventId][msg.sender] = true;

        emit SponsorAdded(_eventId, msg.sender, msg.value);
    }

    /**
     * @dev Get event details
     */
    function getEvent(uint256 _eventId) public view eventExists(_eventId) returns (Event memory) {
        return events[_eventId];
    }

    /**
     * @dev Get participants count for an event
     */
    function getParticipantCount(uint256 _eventId) public view eventExists(_eventId) returns (uint256) {
        return eventParticipants[_eventId].length;
    }

    /**
     * @dev Get sponsors count for an event
     */
    function getSponsorCount(uint256 _eventId) public view eventExists(_eventId) returns (uint256) {
        return eventSponsors[_eventId].length;
    }

    /**
     * @dev Get total sponsorship amount for an event
     */
    function getTotalSponsorship(uint256 _eventId) public view eventExists(_eventId) returns (uint256) {
        uint256 total = 0;
        Sponsor[] memory sponsors = eventSponsors[_eventId];
        for (uint256 i = 0; i < sponsors.length; i++) {
            total += sponsors[i].amount;
        }
        return total;
    }

    /**
     * @dev Close an event
     */
    function closeEvent(uint256 _eventId) public onlyEventOrganizer(_eventId) eventExists(_eventId) {
        events[_eventId].active = false;
        emit EventClosed(_eventId);
    }

    /**
     * @dev Withdraw sponsorship funds (only organizer)
     */
    function withdrawFunds(uint256 _eventId) public onlyEventOrganizer(_eventId) eventExists(_eventId) {
        uint256 amount = getTotalSponsorship(_eventId);
        require(amount > 0, "No funds to withdraw");

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Withdrawal failed");
    }
}
