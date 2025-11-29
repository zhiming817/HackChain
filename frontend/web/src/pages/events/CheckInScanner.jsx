import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { Html5QrcodeScanner } from 'html5-qrcode';
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

      // TODO: Fetch event from contract
      setEvent(null);
      setIsAuthorized(false);
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
      
      if (!qrData.ticketId || !qrData.eventId || !qrData.verificationCode) {
        throw new Error('Invalid QR code format');
      }

      if (qrData.eventId !== eventId) {
        throw new Error('This ticket is for a different event');
      }

      setScannedData(qrData);
      stopScanning();
      handleCheckIn(qrData);
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
      // TODO: Implement check-in transaction
      setSuccess('Check-in successful!');
      setScannedData(null);
      
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      console.error('❌ Check-in error:', err);
      setError(err.message || 'Failed to check in attendee');
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
            <p className="text-orange-100">Scan attendee QR codes to mark HackChainnce</p>
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
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
