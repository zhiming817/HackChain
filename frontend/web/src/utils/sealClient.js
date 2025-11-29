/**
 * Somnia 智能合约交互工具
 * 用于与 Somnia 区块链上的 Hackathon 合约交互
 */

import { ethers } from 'ethers';
import { HACKATHON_CONTRACT_ADDRESS, NFT_TICKET_CONTRACT_ADDRESS, SOMNIA_NETWORK } from '../config/seal.config';

let provider = null;
let signer = null;

/**
 * 初始化以太坊提供者和签名者
 */
export async function initProvider() {
  if (provider && signer) {
    return { provider, signer };
  }

  try {
    // 连接到 Somnia 网络
    provider = new ethers.JsonRpcProvider(SOMNIA_NETWORK.rpcUrl);
    
    // 获取浏览器钱包提供者
    if (typeof window !== 'undefined' && window.ethereum) {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      signer = await browserProvider.getSigner();
    }

    return { provider, signer };
  } catch (error) {
    console.error('Failed to initialize provider:', error);
    throw error;
  }
}

/**
 * 获取以太坊提供者
 */
export function getProvider() {
  if (!provider) {
    throw new Error('Provider not initialized. Call initProvider first.');
  }
  return provider;
}

/**
 * 获取签名者
 */
export async function getSigner() {
  if (!signer) {
    await initProvider();
  }
  return signer;
}

/**
 * 获取用户地址
 */
export async function getUserAddress() {
  try {
    const signerInstance = await getSigner();
    return await signerInstance.getAddress();
  } catch (error) {
    console.error('Failed to get user address:', error);
    throw error;
  }
}

/**
 * 创建合约实例
 * @param {string} contractAddress - 合约地址
 * @param {string} contractABI - 合约 ABI
 * @returns {ethers.Contract} 合约实例
 */
export async function getContractInstance(contractAddress, contractABI) {
  try {
    const signerInstance = await getSigner();
    return new ethers.Contract(contractAddress, contractABI, signerInstance);
  } catch (error) {
    console.error('Failed to create contract instance:', error);
    throw error;
  }
}

/**
 * 发送交易
 * @param {Function} transactionFn - 返回交易对象的函数
 * @returns {Promise<string>} 交易哈希
 */
export async function sendTransaction(transactionFn) {
  try {
    const tx = await transactionFn();
    const receipt = await tx.wait();
    return receipt.hash;
  } catch (error) {
    console.error('Transaction failed:', error);
    throw error;
  }
}

/**
 * 获取账户余额
 * @param {string} address - 账户地址
 * @returns {Promise<string>} 余额（Wei）
 */
export async function getBalance(address) {
  try {
    const providerInstance = getProvider();
    return await providerInstance.getBalance(address);
  } catch (error) {
    console.error('Failed to get balance:', error);
    throw error;
  }
}
