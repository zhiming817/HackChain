/**
 * Wagmi 钱包 hooks 包装器
 * 提供与 Sui dapp-kit 兼容的接口
 */

import { useAccount, useSignMessage, useWriteContract, useReadContract } from 'wagmi';
import { useCallback } from 'react';

/**
 * 获取当前账户信息
 */
export function useCurrentAccount() {
  const { address, isConnected } = useAccount();
  
  if (!isConnected || !address) {
    return null;
  }

  return {
    address,
  };
}

/**
 * 签名消息
 */
export function useSignPersonalMessage() {
  const { signMessageAsync } = useSignMessage();

  const signMessage = useCallback(
    async (message) => {
      try {
        const signature = await signMessageAsync({
          message: typeof message === 'string' ? message : message.message,
        });
        return {
          signature,
          messageBytes: new TextEncoder().encode(
            typeof message === 'string' ? message : message.message
          ),
        };
      } catch (error) {
        console.error('Failed to sign message:', error);
        throw error;
      }
    },
    [signMessageAsync]
  );

  return { signMessage };
}

/**
 * 写入合约
 */
export function useWriteContractWrapper() {
  const { writeContractAsync } = useWriteContract();

  return { writeContractAsync };
}

/**
 * 读取合约
 */
export function useReadContractWrapper() {
  return { readContract: useReadContract };
}
