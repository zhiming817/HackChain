import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { NETWORKS, DEFAULT_NETWORK } from '../config.js';

export default function NetworkSwitcher() {
  const { isConnected } = useAccount();
  const [currentNetwork, setCurrentNetwork] = useState(DEFAULT_NETWORK);
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    checkCurrentNetwork();
  }, [isConnected]);

  const checkCurrentNetwork = async () => {
    if (!window.ethereum || !isConnected) return;

    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const network = Object.entries(NETWORKS).find(
        ([_, config]) => config.chainId === chainId
      );
      if (network) {
        setCurrentNetwork(network[0]);
      }
    } catch (error) {
      console.error('Error checking network:', error);
    }
  };

  const switchNetwork = async (networkKey) => {
    if (!window.ethereum) {
      alert('Please install MetaMask or another Web3 wallet');
      return;
    }

    const networkConfig = NETWORKS[networkKey];
    setSwitching(true);

    try {
      // Try to switch to the network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: networkConfig.chainId }],
      });

      setCurrentNetwork(networkKey);
      setIsOpen(false);
      
      // Reload page to update contract addresses
      window.location.reload();
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: networkConfig.chainId,
                chainName: networkConfig.chainName,
                rpcUrls: networkConfig.rpcUrls,
                nativeCurrency: networkConfig.nativeCurrency,
                blockExplorerUrls: networkConfig.blockExplorerUrls,
              },
            ],
          });

          setCurrentNetwork(networkKey);
          setIsOpen(false);
          
          // Reload page to update contract addresses
          window.location.reload();
        } catch (addError) {
          console.error('Error adding network:', addError);
          alert(`Failed to add network: ${addError.message}`);
        }
      } else {
        console.error('Error switching network:', switchError);
        alert(`Failed to switch network: ${switchError.message}`);
      }
    } finally {
      setSwitching(false);
    }
  };

  const getNetworkIcon = (networkKey) => {
    const icons = {
      monad: '🌐',
      somnia: '💤',
      mantle: '🔷',
    };
    return icons[networkKey] || '🌐';
  };

  const getNetworkColor = (networkKey) => {
    const colors = {
      monad: 'from-orange-500 to-red-600',
      somnia: 'from-purple-500 to-indigo-600',
      mantle: 'from-blue-500 to-cyan-600',
    };
    return colors[networkKey] || 'from-gray-500 to-gray-600';
  };

  if (!isConnected) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-4 py-2 rounded-lg font-bold text-white bg-gradient-to-r ${getNetworkColor(currentNetwork)} hover:shadow-lg transition-all flex items-center gap-2`}
      >
        <span>{getNetworkIcon(currentNetwork)}</span>
        <span>{NETWORKS[currentNetwork].chainName}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Menu */}
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-2xl border-2 border-gray-200 z-50 overflow-hidden">
            <div className="p-3 bg-gray-50 border-b border-gray-200">
              <p className="text-sm font-bold text-gray-700">Select Network</p>
            </div>

            <div className="py-2">
              {Object.entries(NETWORKS).map(([key, config]) => {
                const isCurrentNetwork = key === currentNetwork;
                const hasContracts = config.contracts.HACKATHON_ADDRESS && config.contracts.NFT_TICKET_ADDRESS;

                return (
                  <button
                    key={key}
                    onClick={() => !isCurrentNetwork && switchNetwork(key)}
                    disabled={switching || isCurrentNetwork}
                    className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                      isCurrentNetwork ? 'bg-orange-50' : ''
                    } ${!hasContracts ? 'opacity-50' : ''} disabled:cursor-not-allowed`}
                  >
                    <span className="text-2xl">{getNetworkIcon(key)}</span>
                    <div className="flex-1 text-left">
                      <p className="font-bold text-gray-900 flex items-center gap-2">
                        {config.chainName}
                        {isCurrentNetwork && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            Connected
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        {config.nativeCurrency.symbol} • Chain ID: {config.chainIdDecimal}
                      </p>
                      {!hasContracts && (
                        <p className="text-xs text-red-500 mt-1">⚠️ Contracts not deployed</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-3 bg-gray-50 border-t border-gray-200">
              <p className="text-xs text-gray-600">
                💡 Switching networks will reload the page
              </p>
            </div>
          </div>
        </>
      )}

      {switching && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent"></div>
              <p className="text-lg font-bold text-gray-900">Switching network...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
