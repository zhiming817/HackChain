// 支持的网络配置
export const NETWORKS = {
  monad: {
    chainId: '0x279f', // 10143
    chainIdDecimal: 10143,
    chainName: 'Monad Testnet',
    rpcUrls: ['https://testnet-rpc.monad.xyz'],
    nativeCurrency: {
      name: 'Monad',
      symbol: 'MON',
      decimals: 18,
    },
    blockExplorerUrls: ['https://explorer.testnet.monad.xyz'],
    contracts: {
      HACKATHON_ADDRESS: '0x062F04385CC31a88c4A1996d07b747B914e09E27',
      NFT_TICKET_ADDRESS: '0xF15742734183129cb6f42d2606851952a9b7A4AA',
    }
  },
  somnia: {
    chainId: '0xc488', // 50312
    chainIdDecimal: 50312,
    chainName: 'Somnia Network',
    rpcUrls: ['https://dream-rpc.somnia.network'],
    nativeCurrency: {
      name: 'Somnia',
      symbol: 'STX',
      decimals: 18,
    },
    blockExplorerUrls: ['https://explorer.somnia.network'],
    contracts: {
      HACKATHON_ADDRESS: '', // Deploy contract and update
      NFT_TICKET_ADDRESS: '', // Deploy contract and update
    }
  },
  mantle: {
    chainId: '0x138b', // 5003
    chainIdDecimal: 5003,
    chainName: 'Mantle Sepolia',
    rpcUrls: ['https://rpc.sepolia.mantle.xyz'],
    nativeCurrency: {
      name: 'Mantle',
      symbol: 'MNT',
      decimals: 18,
    },
    blockExplorerUrls: ['https://explorer.sepolia.mantle.xyz'],
    contracts: {
      HACKATHON_ADDRESS: '0xBc069490E48FC701AC2e521c166f72D3ead5214C',
      NFT_TICKET_ADDRESS: '0x3249bfFa26278c26838FFd6686167719F239E21f',
    }
  }
};

// 默认网络
export const DEFAULT_NETWORK = 'monad';

// 当前网络配置（向后兼容）
export const NETWORK_CONFIG = NETWORKS[DEFAULT_NETWORK];

// 合约地址配置（向后兼容）
export const CONTRACT_CONFIG = NETWORKS[DEFAULT_NETWORK].contracts;

/**
 * 获取当前网络的合约地址
 */
export function getCurrentContracts() {
  if (typeof window !== 'undefined' && window.ethereum) {
    const chainId = window.ethereum.chainId;
    const network = Object.values(NETWORKS).find(
      config => config.chainId === chainId
    );
    return network ? network.contracts : NETWORKS[DEFAULT_NETWORK].contracts;
  }
  return NETWORKS[DEFAULT_NETWORK].contracts;
}





