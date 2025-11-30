import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useAccount } from 'wagmi';
import { getProviderAndSigner } from '../services/walletService.js';
import { HACKATHON_ABI } from '../config/contractABI.js';

export default function SponsorModal({ isOpen, onClose, event, onSuccess }) {
  const { address } = useAccount();
  const [sponsorForm, setSponsorForm] = useState({ name: '', amount: '' });
  const [sponsoring, setSponsoring] = useState(false);
  const [walletBalance, setWalletBalance] = useState('0');

  const HACKATHON_CONTRACT_ADDRESS = import.meta.env.VITE_HACKATHON_CONTRACT_ADDRESS;

  useEffect(() => {
    if (isOpen && address) {
      fetchBalance();
      setSponsorForm({ name: '', amount: '' });
    }
  }, [isOpen, address]);

  const fetchBalance = async () => {
    try {
      const { provider } = await getProviderAndSigner();
      const balance = await provider.getBalance(address);
      setWalletBalance(ethers.formatEther(balance));
    } catch (error) {
      console.error('Error fetching balance:', error);
      setWalletBalance('0');
    }
  };

  const handleAddSponsor = async () => {
    if (!sponsorForm.name.trim()) {
      alert('Please enter a sponsor name');
      return;
    }
    if (!sponsorForm.amount || parseFloat(sponsorForm.amount) <= 0) {
      alert('Please enter a valid sponsorship amount');
      return;
    }

    try {
      setSponsoring(true);
      const { signer, provider } = await getProviderAndSigner();
      
      // Check wallet balance
      const balance = await provider.getBalance(address);
      const amountInWei = ethers.parseEther(sponsorForm.amount);
      
      // Estimate gas fee (~0.001 MON)
      const estimatedGas = ethers.parseEther('0.001');
      const totalNeeded = amountInWei + estimatedGas;
      
      if (balance < totalNeeded) {
        const balanceInMon = ethers.formatEther(balance);
        const neededInMon = ethers.formatEther(totalNeeded);
        alert(`Insufficient balance!\nCurrent balance: ${parseFloat(balanceInMon).toFixed(4)} MON\nRequired: ${parseFloat(neededInMon).toFixed(4)} MON (including gas)\n\nPlease top up your wallet with MON tokens.`);
        return;
      }
      
      const contract = new ethers.Contract(
        HACKATHON_CONTRACT_ADDRESS,
        HACKATHON_ABI,
        signer
      );

      console.log('Adding sponsor:', {
        eventId: event.eventId,
        name: sponsorForm.name,
        amount: sponsorForm.amount,
        amountInWei: amountInWei.toString(),
      });

      const tx = await contract.addSponsor(
        event.eventId,
        sponsorForm.name,
        { value: amountInWei }
      );

      console.log('Transaction sent:', tx.hash);
      await tx.wait();
      console.log('Transaction confirmed!');

      alert('Sponsor added successfully!');
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error) {
      console.error('Error adding sponsor:', error);
      if (error.code === 'ACTION_REJECTED') {
        alert('User cancelled the transaction');
      } else if (error.message?.includes('insufficient funds')) {
        alert('Insufficient funds. Please ensure your wallet has enough MON to cover the sponsorship and gas fees');
      } else {
        alert(`Failed to add sponsor: ${error.message}`);
      }
    } finally {
      setSponsoring(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">💰 Add Sponsor</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">Event:</p>
          <p className="font-bold text-gray-900">{event?.title}</p>
          <p className="text-sm text-green-600 mt-2">
            💰 Current balance: {parseFloat(walletBalance).toFixed(4)} MON
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sponsor Name *
            </label>
            <input
              type="text"
              value={sponsorForm.name}
              onChange={(e) => setSponsorForm({ ...sponsorForm, name: e.target.value })}
              placeholder="Enter sponsor name"
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none text-gray-900"
              disabled={sponsoring}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sponsorship Amount (MON) *
            </label>
            <input
              type="number"
              step="0.001"
              min="0"
              value={sponsorForm.amount}
              onChange={(e) => setSponsorForm({ ...sponsorForm, amount: e.target.value })}
              placeholder="0.0"
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none text-gray-900"
              disabled={sponsoring}
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the amount of MON tokens to sponsor
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-all"
            disabled={sponsoring}
          >
            Cancel
          </button>
          <button
            onClick={handleAddSponsor}
            disabled={sponsoring}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sponsoring ? 'Processing...' : 'Confirm Sponsor'}
          </button>
        </div>

        {sponsoring && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700 text-center">
              ⏳ Submitting transaction, please confirm in your wallet...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
