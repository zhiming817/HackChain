/**
 * 钱包服务 - 统一管理钱包连接和网络切换
 * 确保整个项目都使用 Monad 测试网络
 */

import { ethers } from 'ethers';

// Monad 测试网络配置 - 必须是 10143
const MONAD_CHAIN_ID_DECIMAL = 10143;
const MONAD_CHAIN_ID_HEX = '0x279f'; // 10143 in hex

const MONAD_TESTNET = {
  chainId: MONAD_CHAIN_ID_HEX,
  chainName: 'Monad Testnet',
  nativeCurrency: {
    name: 'Monad',
    symbol: 'MON',
    decimals: 18,
  },
  rpcUrls: ['https://testnet-rpc.monad.xyz'],
  blockExplorerUrls: ['https://explorer.testnet.monad.xyz'],
};

/**
 * 初始化钱包连接
 * 自动切换到 Monad 测试网络 (10143)
 */
export async function initializeWallet() {
  if (!window.ethereum) {
    throw new Error('MetaMask not found. Please install MetaMask.');
  }

  try {
    // 请求连接钱包
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });

    console.log('✅ Wallet connected:', accounts[0]);

    // 强制切换到 Monad 网络
    await switchToMonadNetwork();
    
    // 验证网络切换成功
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    const chainIdDecimal = parseInt(chainId, 16);
    
    if (chainIdDecimal !== MONAD_CHAIN_ID_DECIMAL) {
      throw new Error(`Failed to switch to Monad network. Current chain ID: ${chainIdDecimal}`);
    }

    console.log('✅ Connected to Monad Testnet (Chain ID: 10143)');
    return accounts[0];
  } catch (error) {
    if (error.code === 4001) {
      throw new Error('User rejected wallet connection');
    }
    throw error;
  }
}

/**
 * 切换到 Monad 测试网络 (10143)
 */
export async function switchToMonadNetwork() {
  if (!window.ethereum) {
    throw new Error('MetaMask not found');
  }

  try {
    console.log('🔄 Attempting to switch to Monad (Chain ID: 10143)...');
    
    // 尝试切换到 Monad 网络
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: MONAD_CHAIN_ID_HEX }],
    });

    console.log('✅ Switched to Monad Testnet');
    
  } catch (switchError) {
    console.log('Switch error code:', switchError.code, switchError.message);
    
    // 如果网络不存在，添加网络
    if (switchError.code === 4902) {
      try {
        console.log('📝 Network not found, adding Monad network...');
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [MONAD_TESTNET],
        });

        console.log('✅ Monad Testnet added');
        
        // 再次尝试切换
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: MONAD_CHAIN_ID_HEX }],
        });
        
        console.log('✅ Switched to Monad Testnet');
      } catch (addError) {
        console.error('Add network error:', addError);
        // 如果是因为相同 RPC endpoint 的错误，忽略并继续
        if (addError.message?.includes('RPC endpoint')) {
          console.log('⚠️ Network already exists with same RPC endpoint, attempting to switch...');
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: MONAD_CHAIN_ID_HEX }],
            });
            console.log('✅ Switched to Monad Testnet');
          } catch (switchError2) {
            console.error('Switch error:', switchError2);
            if (switchError2.code !== 4001) {
              throw switchError2;
            }
          }
        } else if (addError.code === 4001) {
          throw new Error('User rejected network addition');
        } else {
          console.log('⚠️ Could not add network, but continuing...');
        }
      }
    } else if (switchError.code === 4001) {
      throw new Error('User rejected network switch');
    } else {
      throw switchError;
    }
  }
}

/**
 * 获取 Provider 和 Signer
 */
export async function getProviderAndSigner() {
  if (!window.ethereum) {
    throw new Error('MetaMask not found');
  }

  // 检查当前网络，如果不是 Monad 则切换
  const chainId = await window.ethereum.request({ method: 'eth_chainId' });
  const currentChainId = parseInt(chainId, 16);
  
  if (currentChainId !== MONAD_CHAIN_ID_DECIMAL) {
    console.log(`Current chain: ${currentChainId}, switching to Monad (${MONAD_CHAIN_ID_DECIMAL})...`);
    await switchToMonadNetwork();
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  return { provider, signer };
}

/**
 * 获取当前网络信息
 */
export async function getCurrentNetwork() {
  if (!window.ethereum) {
    throw new Error('MetaMask not found');
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const network = await provider.getNetwork();

  return {
    chainId: network.chainId,
    name: network.name,
    isMonad: network.chainId === BigInt(MONAD_CHAIN_ID_DECIMAL),
  };
}

/**
 * 获取账户余额
 */
export async function getBalance(address) {
  const provider = new ethers.JsonRpcProvider(MONAD_TESTNET.rpcUrls[0]);
  const balanceWei = await provider.getBalance(address);
  return ethers.formatEther(balanceWei);
}

/**
 * 监听网络变化
 */
export function onNetworkChange(callback) {
  if (!window.ethereum) return;

  window.ethereum.on('chainChanged', (chainId) => {
    const isMonad = parseInt(chainId, 16) === MONAD_CHAIN_ID_DECIMAL;
    callback({
      chainId: parseInt(chainId, 16),
      isMonad,
    });
  });
}

/**
 * 监听账户变化
 */
export function onAccountChange(callback) {
  if (!window.ethereum) return;

  window.ethereum.on('accountsChanged', (accounts) => {
    callback(accounts[0] || null);
  });
}

/**
 * 移除监听
 */
export function removeNetworkListener() {
  if (!window.ethereum) return;
  window.ethereum.removeAllListeners('chainChanged');
}

export function removeAccountListener() {
  if (!window.ethereum) return;
  window.ethereum.removeAllListeners('accountsChanged');
}

export const MONAD_CONFIG = {
  ...MONAD_TESTNET,
  chainIdDecimal: MONAD_CHAIN_ID_DECIMAL,
};

// 向后兼容的导出
export const switchToSomniaNetwork = switchToMonadNetwork;
