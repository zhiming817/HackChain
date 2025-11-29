/**
 * Somnia 智能合约配置
 */

// Hackathon 合约地址 (Somnia 测试网)
export const HACKATHON_CONTRACT_ADDRESS = import.meta.env.VITE_HACKATHON_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';

// NFT 门票合约地址
export const NFT_TICKET_CONTRACT_ADDRESS = import.meta.env.VITE_NFT_TICKET_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';

// Somnia 网络配置
export const SOMNIA_NETWORK = {
  chainId: 50312,
  rpcUrl: import.meta.env.VITE_SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network',
  explorerUrl: 'https://somnia-testnet.explorer.com',
};

// 合约配置
export const CONTRACT_CONFIG = {
  hackathonAddress: HACKATHON_CONTRACT_ADDRESS,
  nftTicketAddress: NFT_TICKET_CONTRACT_ADDRESS,
};

/**
 * 获取合约地址
 * @param {string} contractName - 合约名称
 * @returns {string} 合约地址
 */
export function getContractAddress(contractName) {
  return CONTRACT_CONFIG[`${contractName}Address`];
}
