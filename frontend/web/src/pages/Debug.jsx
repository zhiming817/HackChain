import React, { useState } from 'react';
import { ethers } from 'ethers';
import { getProviderAndSigner } from '../services/walletService.js';
import { HACKATHON_ABI } from '../config/contractABI.js';

export default function Debug() {
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);

  const log = (msg) => {
    console.log(msg);
    setOutput(prev => prev + msg + '\n');
  };

  const testConnection = async () => {
    try {
      setLoading(true);
      setOutput('');
      
      log('🔍 Testing wallet connection...');
      
      // 首先检查当前网络
      if (window.ethereum) {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        const chainIdDecimal = parseInt(chainId, 16);
        log(`📡 Current chain ID: ${chainId} (${chainIdDecimal})`);
        
        if (chainIdDecimal !== 50312) {
          log('⚠️ Wrong network! Attempting to switch to Somnia (50312)...');
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0xc4a8' }],
            });
            log('✅ Switched to Somnia network');
            
            // 验证切换成功
            const newChainId = await window.ethereum.request({ method: 'eth_chainId' });
            const newChainIdDecimal = parseInt(newChainId, 16);
            log(`✅ Verified chain ID: ${newChainId} (${newChainIdDecimal})`);
          } catch (err) {
            log(`❌ Failed to switch network: ${err.code} - ${err.message}`);
            
            if (err.code === 4902) {
              log('📝 Network not found in MetaMask');
              log('⚠️ Please manually add Somnia network to MetaMask:');
              log('  Chain ID: 50312 (0xc4a8)');
              log('  RPC URL: https://dream-rpc.somnia.network');
              log('  Symbol: SOMNIA');
            }
          }
        }
      }
      
      const { provider, signer } = await getProviderAndSigner();
      
      const address = await signer.getAddress();
      log(`✅ Connected address: ${address}`);
      
      const balance = await provider.getBalance(address);
      log(`💰 Balance: ${ethers.formatEther(balance)} SOMNIA`);
      
      const network = await provider.getNetwork();
      log(`🌐 Network: ${network.name} (Chain ID: ${network.chainId})`);
      
      // 测试合约地址
      const contractAddress = import.meta.env.VITE_HACKATHON_CONTRACT_ADDRESS;
      log(`📝 Contract address: ${contractAddress}`);
      
      if (!ethers.isAddress(contractAddress)) {
        log('❌ Invalid contract address');
        return;
      }
      
      // 检查合约代码
      const code = await provider.getCode(contractAddress);
      if (code === '0x') {
        log('❌ No contract code at address (contract not deployed)');
      } else {
        log(`✅ Contract code found (${code.length} bytes)`);
      }
      
      // 尝试创建合约实例
      const contract = new ethers.Contract(contractAddress, HACKATHON_ABI, signer);
      log('✅ Contract instance created');
      
      // 尝试调用 eventCounter
      try {
        const counter = await contract.eventCounter();
        log(`✅ Event counter: ${counter.toString()}`);
      } catch (err) {
        log(`⚠️ Could not read eventCounter: ${err.message}`);
      }
      
      // 尝试估算 gas
      try {
        const gasEstimate = await contract.createEvent.estimateGas(
          'Test Event',
          'Test Description',
          Math.floor(Date.now() / 1000) + 3600,
          Math.floor(Date.now() / 1000) + 7200,
          'Test Location',
          100
        );
        log(`✅ Gas estimate for createEvent: ${gasEstimate.toString()}`);
      } catch (err) {
        log(`⚠️ Could not estimate gas: ${err.message}`);
      }
      
    } catch (err) {
      log(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">🔧 Debug Console</h1>
      
      <button
        onClick={testConnection}
        disabled={loading}
        className="px-6 py-2 bg-blue-500 text-white rounded-lg font-bold mb-4 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test Connection'}
      </button>
      
      <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto h-96 font-mono text-sm">
        {output}
      </pre>
    </div>
  );
}
