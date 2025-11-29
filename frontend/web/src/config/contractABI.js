/**
 * 智能合约 ABI - 直接从编译的合约文件提取
 */

// Hackathon 合约 ABI
export const HACKATHON_ABI = [
  {
    inputs: [],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [
      { internalType: 'uint256', name: '_eventId', type: 'uint256' },
      { internalType: 'string', name: '_sponsorName', type: 'string' },
    ],
    name: 'addSponsor',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: '_eventId', type: 'uint256' },
      { internalType: 'address', name: '_participant', type: 'address' },
      { internalType: 'uint256', name: '_tokenId', type: 'uint256' },
    ],
    name: 'checkInParticipant',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_eventId', type: 'uint256' }],
    name: 'closeEvent',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'string', name: '_title', type: 'string' },
      { internalType: 'string', name: '_description', type: 'string' },
      { internalType: 'uint256', name: '_startTime', type: 'uint256' },
      { internalType: 'uint256', name: '_endTime', type: 'uint256' },
      { internalType: 'string', name: '_location', type: 'string' },
      { internalType: 'uint256', name: '_maxParticipants', type: 'uint256' },
    ],
    name: 'createEvent',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'eventCounter',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_eventId', type: 'uint256' }],
    name: 'getEvent',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'id', type: 'uint256' },
          { internalType: 'address', name: 'organizer', type: 'address' },
          { internalType: 'string', name: 'title', type: 'string' },
          { internalType: 'string', name: 'description', type: 'string' },
          { internalType: 'uint256', name: 'startTime', type: 'uint256' },
          { internalType: 'uint256', name: 'endTime', type: 'uint256' },
          { internalType: 'string', name: 'location', type: 'string' },
          { internalType: 'uint256', name: 'maxParticipants', type: 'uint256' },
          { internalType: 'uint256', name: 'participantCount', type: 'uint256' },
          { internalType: 'bool', name: 'active', type: 'bool' },
          { internalType: 'uint256', name: 'createdAt', type: 'uint256' },
        ],
        internalType: 'struct Hackathon.Event',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_eventId', type: 'uint256' }],
    name: 'getParticipantCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_eventId', type: 'uint256' }],
    name: 'getSponsorCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_eventId', type: 'uint256' }],
    name: 'getTotalSponsorship',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_eventId', type: 'uint256' }],
    name: 'withdrawFunds',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: '_eventId', type: 'uint256' },
      { internalType: 'string', name: '_name', type: 'string' },
    ],
    name: 'registerParticipant',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

// NFT Ticket 合约 ABI
export const NFT_TICKET_ABI = [
  {
    inputs: [{ internalType: 'address', name: '_hackathonContract', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [
      { internalType: 'uint256', name: '_eventId', type: 'uint256' },
      { internalType: 'address', name: '_holder', type: 'address' },
      { internalType: 'string', name: '_eventTitle', type: 'string' },
      { internalType: 'string', name: '_location', type: 'string' },
      { internalType: 'uint256', name: '_startTime', type: 'uint256' },
      { internalType: 'uint256', name: '_endTime', type: 'uint256' },
    ],
    name: 'issueTicket',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_tokenId', type: 'uint256' }],
    name: 'useTicket',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_tokenId', type: 'uint256' }],
    name: 'getTicket',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
          { internalType: 'uint256', name: 'eventId', type: 'uint256' },
          { internalType: 'address', name: 'holder', type: 'address' },
          { internalType: 'string', name: 'eventTitle', type: 'string' },
          { internalType: 'string', name: 'location', type: 'string' },
          { internalType: 'uint256', name: 'startTime', type: 'uint256' },
          { internalType: 'uint256', name: 'endTime', type: 'uint256' },
          { internalType: 'bool', name: 'used', type: 'bool' },
          { internalType: 'uint256', name: 'issuedAt', type: 'uint256' },
        ],
        internalType: 'struct NFTTicket.Ticket',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_tokenId', type: 'uint256' }],
    name: 'isTicketValid',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
];
