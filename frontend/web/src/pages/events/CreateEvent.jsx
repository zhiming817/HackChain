import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { getProviderAndSigner } from '../../services/walletService.js';
import { HACKATHON_ABI } from '../../config/contractABI.js';
import Navbar from '../../layout/Navbar.jsx';
import Footer from '../../layout/Footer.jsx';

export default function CreateEvent() {
  const navigate = useNavigate();
  const [address, setAddress] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // 检查钱包连接状态
  useEffect(() => {
    checkWalletConnection();
  }, []);

  const checkWalletConnection = async () => {
    if (!window.ethereum) return;

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_accounts',
      });

      if (accounts.length > 0) {
        setAddress(accounts[0]);
        setIsConnected(true);
      }
    } catch (err) {
      console.error('Error checking wallet:', err);
    }
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [txHash, setTxHash] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    location: '',
    maxParticipants: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    // 验证表单
    if (!formData.title || !formData.description || !formData.startTime || 
        !formData.endTime || !formData.location || !formData.maxParticipants) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setTxHash('');

    try {
      console.log('🎭 Creating event with data:', formData);

      // 获取 provider 和 signer（自动切换到 Somnia 网络）
      const { provider, signer } = await getProviderAndSigner();

      // 获取合约地址
      const contractAddress = import.meta.env.VITE_HACKATHON_CONTRACT_ADDRESS;
      if (!contractAddress) {
        throw new Error('Contract address not configured in .env');
      }

      // 验证合约地址格式
      if (!ethers.isAddress(contractAddress)) {
        throw new Error(`Invalid contract address: ${contractAddress}`);
      }

      const signerAddress = await signer.getAddress();
      console.log('📝 Contract address:', contractAddress);
      console.log('📝 Signer address:', signerAddress);

      // 检查合约是否存在
      const code = await provider.getCode(contractAddress);
      if (code === '0x') {
        throw new Error('No contract code at address - contract may not be deployed');
      }
      console.log('✅ Contract code found');

      // 创建合约实例
      const contract = new ethers.Contract(contractAddress, HACKATHON_ABI, signer);

      // 转换时间戳
      const startTime = new Date(formData.startTime);
      const endTime = new Date(formData.endTime);

      if (startTime >= endTime) {
        throw new Error('Start time must be before end time');
      }

      const startTimeUnix = Math.floor(startTime.getTime() / 1000);
      const endTimeUnix = Math.floor(endTime.getTime() / 1000);
      const maxParticipants = parseInt(formData.maxParticipants);

      console.log('📋 Event details:');
      console.log('  Title:', formData.title);
      console.log('  Description:', formData.description);
      console.log('  Start:', startTimeUnix);
      console.log('  End:', endTimeUnix);
      console.log('  Location:', formData.location);
      console.log('  Max participants:', maxParticipants);

      // 调用合约方法
      console.log('⏳ Sending transaction...');
      const tx = await contract.createEvent(
        formData.title,
        formData.description,
        startTimeUnix,
        endTimeUnix,
        formData.location,
        maxParticipants
      );

      console.log('✅ Transaction sent:', tx.hash);
      setTxHash(tx.hash);

      // 等待交易确认
      console.log('⏳ Waiting for confirmation...');
      const receipt = await tx.wait();

      console.log('✅ Transaction confirmed:', receipt.hash);
      setSuccess('✨ Event created successfully!');

      // 2秒后跳转到我的活动页面
      setTimeout(() => {
        navigate('/events/my');
      }, 2000);

    } catch (err) {
      console.error('❌ Error creating event:', err);
      console.error('Full error object:', err);
      
      // 处理不同的错误类型
      let errorMessage = 'Failed to create event';
      
      if (err.code === 'ACTION_REJECTED' || err.code === 4001) {
        errorMessage = 'Transaction rejected by user';
      } else if (err.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for transaction';
      } else if (err.message?.includes('Start time must be before end time')) {
        errorMessage = 'Start time must be before end time';
      } else if (err.message?.includes('Invalid contract address')) {
        errorMessage = 'Invalid contract address. Please check .env configuration';
      } else if (err.message?.includes('No contract code')) {
        errorMessage = 'Contract not deployed at this address';
      } else if (err.reason) {
        errorMessage = `Contract error: ${err.reason}`;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-12">
        <button
          onClick={() => navigate('/')}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-orange-600 font-medium transition-colors"
        >
          <span>←</span> Back to Home
        </button>

        <div className="bg-white rounded-2xl shadow-xl border-2 border-orange-200 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-red-600 p-6 text-white">
            <h1 className="text-3xl font-black mb-2">📅 Create Event</h1>
            <p className="text-orange-100">Create a new hackathon event on Somnia blockchain</p>
          </div>

          <div className="p-8">
            {!isConnected && (
              <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700">
                <p className="font-medium">⚠️ Please connect your wallet to create an event</p>
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
                <p className="font-medium">❌ {error}</p>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700">
                <p className="font-medium">✅ {success}</p>
                {txHash && (
                  <p className="text-sm mt-2">
                    Transaction: <span className="font-mono">{txHash.slice(0, 10)}...{txHash.slice(-8)}</span>
                  </p>
                )}
              </div>
            )}

            {loading && (
              <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 text-blue-700">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
                  <p className="font-medium">⏳ Processing transaction...</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Event Title</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g., Web3 Hackathon 2024"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe your event..."
                  rows="4"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 text-gray-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Start Time</label>
                  <input
                    type="datetime-local"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">End Time</label>
                  <input
                    type="datetime-local"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 text-gray-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Location</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="e.g., San Francisco, CA"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Max Participants</label>
                <input
                  type="number"
                  name="maxParticipants"
                  value={formData.maxParticipants}
                  onChange={handleInputChange}
                  placeholder="e.g., 100"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 text-gray-900"
                  required
                  min="1"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !isConnected}
                className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    Creating...
                  </>
                ) : (
                  '✨ Create Event'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
