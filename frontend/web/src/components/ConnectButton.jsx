import React, { useState, useEffect } from 'react';
import { getBalance, initializeWallet } from '../services/walletService.js';

export default function ConnectButton() {
  const [address, setAddress] = useState(null);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatBalance = (bal) => {
    if (!bal) return '0';
    const num = parseFloat(bal);
    if (num < 0.0001) return '< 0.0001';
    return num.toFixed(4);
  };

  // 初始化时检查是否已连接
  useEffect(() => {
    checkConnectedWallet();
  }, []);

  // 监听账户变化
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length > 0) {
        setAddress(accounts[0]);
        fetchBalance(accounts[0]);
      } else {
        setAddress(null);
        setBalance(null);
      }
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, []);

  const checkConnectedWallet = async () => {
    if (!window.ethereum) return;

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_accounts',
      });

      if (accounts.length > 0) {
        setAddress(accounts[0]);
        fetchBalance(accounts[0]);
      }
    } catch (err) {
      console.error('Error checking wallet:', err);
    }
  };

  const fetchBalance = async (addr) => {
    try {
      setLoading(true);
      const bal = await getBalance(addr);
      setBalance(bal);
    } catch (err) {
      console.error('Failed to fetch balance:', err);
      setBalance(null);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);
      const addr = await initializeWallet();
      setAddress(addr);
      await fetchBalance(addr);
    } catch (err) {
      console.error('Connection error:', err);
      alert(err.message || 'Failed to connect wallet');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setAddress(null);
    setBalance(null);
  };

  if (address) {
    return (
      <div className="flex items-center space-x-3">
        <div className="text-right hidden sm:block">
          <div className="text-sm font-medium text-gray-900">
            {formatAddress(address)}
          </div>
          <div className="text-xs text-gray-500">
            {loading ? '加载中...' : `💰 ${formatBalance(balance)} MON`}
          </div>
        </div>
        <button
          onClick={handleDisconnect}
          className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={connecting}
      className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {connecting ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
}
