/**
 * 钱包服务 - 统一管理钱包连接和网络切换
 * 支持多网络切换
 */

import { ethers } from 'ethers';
import { NETWORKS, DEFAULT_NETWORK } from '../config.js';

/**
 * 获取当前网络配置
 */
export function getCurrentNetworkConfig() {
  if (typeof window !== 'undefined' && window.ethereum) {
    const chainId = window.ethereum.chainId;
    const network = Object.entries(NETWORKS).find(
      ([_, config]) => config.chainId === chainId
    );
    return network ? network[1] : NETWORKS[DEFAULT_NETWORK];
  }
  return NETWORKS[DEFAULT_NETWORK];
}

/**
 * 初始化钱包连接
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
    
    // 验证当前网络
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    const chainIdDecimal = parseInt(chainId, 16);
    
    console.log(`✅ Connected to Chain ID: ${chainIdDecimal}`);
    return accounts[0];
  } catch (error) {
    if (error.code === 4001) {
      throw new Error('User rejected wallet connection');
    }
    throw error;
  }
}

/**
 * 切换到指定网络
 */
export async function switchToNetwork(networkKey = DEFAULT_NETWORK) {
  if (!window.ethereum) {
    throw new Error('MetaMask not found');
  }

  const networkConfig = NETWORKS[networkKey];
  if (!networkConfig) {
    throw new Error(`Network ${networkKey} not found`);
  }

  try {
    console.log(`🔄 Attempting to switch to ${networkConfig.chainName}...`);
    
    // 尝试切换到指定网络
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: networkConfig.chainId }],
    });

    console.log(`✅ Switched to ${networkConfig.chainName}`);
    
  } catch (switchError) {
    console.log('Switch error code:', switchError.code, switchError.message);
    
    // 如果网络不存在，添加网络
    if (switchError.code === 4902) {
      try {
        console.log(`📝 Network not found, adding ${networkConfig.chainName}...`);
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: networkConfig.chainId,
            chainName: networkConfig.chainName,
            rpcUrls: networkConfig.rpcUrls,
            nativeCurrency: networkConfig.nativeCurrency,
            blockExplorerUrls: networkConfig.blockExplorerUrls,
          }],
        });

        console.log(`✅ ${networkConfig.chainName} added and switched`);
      } catch (addError) {
        console.error('Add network error:', addError);
        if (addError.code === 4001) {
          throw new Error('User rejected network addition');
        }
        throw addError;
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

  const networkEntry = Object.entries(NETWORKS).find(
    ([_, config]) => BigInt(config.chainIdDecimal) === network.chainId
  );

  return {
    chainId: network.chainId,
    name: network.name,
    networkKey: networkEntry ? networkEntry[0] : null,
    config: networkEntry ? networkEntry[1] : null,
  };
}

/**
 * 获取账户余额
 */
export async function getBalance(address) {
  const networkConfig = getCurrentNetworkConfig();
  const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrls[0]);
  const balanceWei = await provider.getBalance(address);
  return ethers.formatEther(balanceWei);
}

/**
 * 监听网络变化
 */
export function onNetworkChange(callback) {
  if (!window.ethereum) return;

  window.ethereum.on('chainChanged', (chainId) => {
    const chainIdDecimal = parseInt(chainId, 16);
    const networkEntry = Object.entries(NETWORKS).find(
      ([_, config]) => config.chainIdDecimal === chainIdDecimal
    );
    callback({
      chainId: chainIdDecimal,
      networkKey: networkEntry ? networkEntry[0] : null,
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

// 向后兼容的导出
export const switchToMonadNetwork = () => switchToNetwork('monad');
export const switchToSomniaNetwork = () => switchToNetwork('somnia');
