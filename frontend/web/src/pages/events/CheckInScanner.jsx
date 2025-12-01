import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { ethers } from 'ethers';
import { getProviderAndSigner } from '../../services/walletService.js';
import { HACKATHON_ABI } from '../../config/contractABI.js';
import Navbar from '../../layout/Navbar.jsx';
import Footer from '../../layout/Footer.jsx';

export default function CheckInScanner() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [scannedData, setScannedData] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [scanner, setScanner] = useState(null);

  useEffect(() => {
    loadEvent();
  }, [eventId, isConnected, address]);

  useEffect(() => {
    return () => {
      if (scanner) {
        scanner.clear().catch(console.error);
      }
    };
  }, [scanner]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      setError('');

      if (!isConnected) {
        setError('Please connect your wallet first');
        return;
      }

      // 从后端获取活动信息
      const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/events/${eventId}`;
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error('Failed to fetch event');
      }
      
      const result = await response.json();
      
      if (result.code === 0 && result.data) {
        const eventData = result.data;
        setEvent(eventData);
        
        // 检查当前用户是否是活动组织者
        const isOrganizer = eventData.organizer.toLowerCase() === address.toLowerCase();
        setIsAuthorized(isOrganizer);
        
        if (!isOrganizer) {
          setError('You are not authorized to perform check-ins. Only the event organizer can check in attendees.');
        }
      } else {
        setError('Event not found');
      }
    } catch (err) {
      console.error('Error loading event:', err);
      setError('Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  const startScanning = () => {
    setScanning(true);
    setError('');
    setSuccess('');
    setScannedData(null);

    setTimeout(() => {
      const qrReaderElement = document.getElementById('qr-reader');
      if (!qrReaderElement) {
        setError('QR reader element not found');
        setScanning(false);
        return;
      }

      const html5QrcodeScanner = new Html5QrcodeScanner(
        'qr-reader',
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          rememberLastUsedCamera: true,
        },
        false
      );

      html5QrcodeScanner.render(onScanSuccess, onScanError);
      setScanner(html5QrcodeScanner);
    }, 100);
  };

  const stopScanning = () => {
    if (scanner) {
      scanner.clear().catch(console.error);
      setScanner(null);
    }
    setScanning(false);
  };

  const onScanSuccess = (decodedText) => {
    console.log('QR Code scanned:', decodedText);
    
    try {
      const qrData = JSON.parse(decodedText);
      
      // 验证必需的字段
      if (!qrData.tokenId || !qrData.eventId || !qrData.holder) {
        throw new Error('Invalid QR code format: missing required fields');
      }

      // 验证事件ID是否匹配
      if (qrData.eventId.toString() !== eventId) {
        throw new Error('This ticket is for a different event');
      }

      setScannedData(qrData);
      stopScanning();
      // 不自动执行签到，等待用户点击按钮
    } catch (err) {
      console.error('QR code parse error:', err);
      setError(`Invalid QR code: ${err.message}`);
    }
  };

  const onScanError = (error) => {
    // Ignore scanning errors
  };

  const handleCheckIn = async (qrData) => {
    if (!isConnected || !isAuthorized) {
      setError('You are not authorized to perform check-ins');
      return;
    }

    setProcessing(true);
    setError('');
    setSuccess('');

    try {
      console.log('🎫 Starting check-in process...');
      
      // 获取 provider 和 signer
      const { signer } = await getProviderAndSigner();
      
      // 获取合约地址
      const hackathonContractAddress = import.meta.env.VITE_HACKATHON_CONTRACT_ADDRESS;
      
      if (!hackathonContractAddress) {
        throw new Error('Contract address not configured');
      }

      // 创建合约实例
      const hackathonContract = new ethers.Contract(
        hackathonContractAddress,
        HACKATHON_ABI,
        signer
      );

      console.log('📝 Calling checkInParticipant with tokenId...');
      // 调用 Hackathon 合约的 checkInParticipant 方法
      // 合约会自动调用 NFTTicket.useTicket 标记门票为已使用
      const checkInTx = await hackathonContract.checkInParticipant(
        qrData.eventId,
        qrData.holder,
        qrData.tokenId
      );
      
      console.log('⏳ Waiting for transaction confirmation...');
      await checkInTx.wait();
      console.log('✅ Check-in completed, ticket marked as used');

      setSuccess(`✅ Check-in successful for ${qrData.holder.slice(0, 6)}...${qrData.holder.slice(-4)}. Ticket has been marked as used.`);
      
      // 不立即清除 scannedData，让用户可以看到信息
    } catch (err) {
      console.error('❌ Check-in error:', err);
      
      let errorMessage = 'Failed to check in attendee';
      
      if (err.code === 'ACTION_REJECTED' || err.code === 4001) {
        errorMessage = 'Transaction rejected by user';
      } else if (err.message?.includes('Participant not registered')) {
        errorMessage = 'This participant is not registered for the event';
      } else if (err.message?.includes('Already checked in')) {
        errorMessage = 'This participant has already been checked in';
      } else if (err.reason) {
        errorMessage = `Contract error: ${err.reason}`;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading event...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <div className="text-6xl mb-4">😢</div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-8">{error}</p>
          <button
            onClick={() => navigate(`/events/${eventId}`)}
            className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
          >
            Back to Event
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-12">
        <button
          onClick={() => navigate(`/events/${eventId}`)}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-orange-600 font-medium transition-colors"
        >
          <span>←</span> Back to Event
        </button>

        <div className="bg-white rounded-2xl shadow-xl border-2 border-orange-200 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-red-600 p-6 text-white">
            <h1 className="text-3xl font-black mb-2">📱 Check-In Scanner</h1>
            <p className="text-orange-100">Scan attendee QR codes to mark attendance</p>
          </div>

          <div className="p-8">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
                <p className="font-medium">❌ {error}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-500 text-green-700">
                <p className="font-medium">✅ {success}</p>
              </div>
            )}

            {!scanning && !processing && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📷</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Ready to Scan</h3>
                <p className="text-gray-600 mb-6">
                  Click below to start scanning attendee QR codes
                </p>
                <button
                  onClick={startScanning}
                  disabled={!isAuthorized}
                  className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  🎫 Start Scanning
                </button>
                {!isAuthorized && (
                  <p className="mt-4 text-sm text-red-600 font-medium">
                    ⚠️ Only the event organizer can perform check-ins
                  </p>
                )}
              </div>
            )}

            {scanning && (
              <div>
                <div className="mb-4 text-center">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">📷 Scanning...</h3>
                  <p className="text-gray-600">Position the QR code within the frame</p>
                </div>
                
                <div id="qr-reader" className="mb-4"></div>
                
                <button
                  onClick={stopScanning}
                  className="w-full px-6 py-3 bg-gray-500 text-white rounded-lg font-bold hover:bg-gray-600 transition-all"
                >
                  Stop Scanning
                </button>
              </div>
            )}

            {processing && (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mb-4"></div>
                <p className="text-gray-600 font-medium">Processing check-in...</p>
              </div>
            )}

            {scannedData && !processing && !success && (
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border-2 border-blue-300 p-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span>📋</span>
                  <span>Scanned Ticket Information</span>
                </h3>
                
                <div className="space-y-3 mb-6">
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-500 mb-1">Token ID</p>
                    <p className="text-lg font-bold text-gray-900">#{scannedData.tokenId}</p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-500 mb-1">Event Title</p>
                    <p className="text-lg font-semibold text-gray-900">{scannedData.eventTitle || 'N/A'}</p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-500 mb-1">Holder Address</p>
                    <p className="text-sm font-mono text-gray-900 break-all">{scannedData.holder}</p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-500 mb-1">Location</p>
                    <p className="text-lg text-gray-900">{scannedData.location || 'N/A'}</p>
                  </div>
                  
                  {scannedData.issuedAt && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <p className="text-sm text-gray-500 mb-1">Issued At</p>
                      <p className="text-lg text-gray-900">
                        {new Date(scannedData.issuedAt * 1000).toLocaleString('en-US')}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleCheckIn(scannedData)}
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-bold hover:shadow-lg transition-all transform hover:scale-105"
                  >
                    ✅ Confirm Check-In
                  </button>
                  <button
                    onClick={() => {
                      setScannedData(null);
                      setSuccess('');
                      setError('');
                    }}
                    className="px-6 py-4 bg-gray-500 text-white rounded-lg font-bold hover:bg-gray-600 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {scannedData && !processing && success && (
              <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg border-2 border-green-300 p-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span>✅</span>
                  <span>Check-In Completed</span>
                </h3>
                
                <div className="space-y-3 mb-6">
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-500 mb-1">Token ID</p>
                    <p className="text-lg font-bold text-gray-900">#{scannedData.tokenId}</p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-500 mb-1">Event Title</p>
                    <p className="text-lg font-semibold text-gray-900">{scannedData.eventTitle || 'N/A'}</p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-500 mb-1">Holder Address</p>
                    <p className="text-sm font-mono text-gray-900 break-all">{scannedData.holder}</p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-500 mb-1">Location</p>
                    <p className="text-lg text-gray-900">{scannedData.location || 'N/A'}</p>
                  </div>
                  
                  {scannedData.issuedAt && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <p className="text-sm text-gray-500 mb-1">Issued At</p>
                      <p className="text-lg text-gray-900">
                        {new Date(scannedData.issuedAt * 1000).toLocaleString('en-US')}
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    setScannedData(null);
                    setSuccess('');
                    setError('');
                  }}
                  className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-bold hover:shadow-lg transition-all"
                >
                  Scan Next Ticket
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
