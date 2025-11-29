import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { getProviderAndSigner } from '../../services/walletService.js';
import { HACKATHON_ABI } from '../../config/contractABI.js';
import Navbar from '../../layout/Navbar.jsx';
import Footer from '../../layout/Footer.jsx';

export default function EventDetail() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const [event, setEvent] = useState(null);
  const [sponsors, setSponsors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingSponsors, setLoadingSponsors] = useState(false);
  const [loadError, setLoadError] = useState(''); // error while loading the event
  const [error, setError] = useState(''); // error during registration
  const [registering, setRegistering] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [participantName, setParticipantName] = useState('');

  useEffect(() => {
    loadEvent();
    loadSponsors();
  }, [eventId]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/events/${eventId}`;
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch event');
      }
      const result = await response.json();
      
      if (result.code === 0 && result.data) {
        // convert backend response format to frontend-friendly format
        const transformedEvent = {
          id: result.data.id,
          eventId: result.data.event_id,
          organizer: result.data.organizer,
          title: result.data.title,
          description: result.data.description,
          startTime: result.data.start_time,
          endTime: result.data.end_time,
          location: result.data.location,
          maxParticipants: result.data.max_participants,
          participants: result.data.participant_count,
          active: result.data.active,
          createdAt: result.data.created_at,
          updatedAt: result.data.updated_at,
          syncedAt: result.data.synced_at,
        };
        setEvent(transformedEvent);
        // only set load error on the initial load; keep existing state on reloads
        if (!event) {
          setLoadError('');
        }
      } else {
        // only set load error on the initial load
        if (!event) {
          setLoadError('Event not found');
        }
      }
    } catch (err) {
      console.error('Error loading event:', err);
      // only set load error on the initial load
      if (!event) {
        setLoadError('Failed to load event');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadSponsors = async () => {
    try {
      setLoadingSponsors(true);
      const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/events/${eventId}/sponsors`;
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch sponsors');
      }
      const result = await response.json();
      
      if (result.code === 0 && result.data) {
        setSponsors(result.data);
      }
    } catch (err) {
      console.error('Error loading sponsors:', err);
    } finally {
      setLoadingSponsors(false);
    }
  };

  const formatAmount = (amount) => {
    try {
      // convert Wei to MON
      const formatted = ethers.formatEther(amount);
      return parseFloat(formatted).toFixed(4);
    } catch (error) {
      return '0';
    }
  };

  const getTotalSponsorship = () => {
    if (!sponsors || sponsors.length === 0) return '0';
    try {
      const total = sponsors.reduce((sum, sponsor) => {
        return sum + BigInt(sponsor.amount);
      }, BigInt(0));
      return parseFloat(ethers.formatEther(total.toString())).toFixed(4);
    } catch (error) {
      return '0';
    }
  };

  const handleRegister = async () => {
    if (!participantName.trim()) {
      setError('Please enter your name');
      return;
    }

    setRegistering(true);
    setError('');
    setRegisterSuccess('');

    try {
      console.log('🎭 Registering for event:', event.eventId);

      // get provider and signer (may switch network automatically)
      const { signer } = await getProviderAndSigner();

      // get contract address
      const contractAddress = import.meta.env.VITE_HACKATHON_CONTRACT_ADDRESS;
      if (!contractAddress) {
        throw new Error('Contract address not configured');
      }

      // create contract instance
      const contract = new ethers.Contract(contractAddress, HACKATHON_ABI, signer);

      // call contract.registerParticipant
      // use BigInt for big number precision
      console.log('⏳ Sending registration transaction...');
      const eventIdBigInt = ethers.toBigInt(event.eventId);
      console.log('Event ID (BigInt):', eventIdBigInt.toString());
      const tx = await contract.registerParticipant(eventIdBigInt, participantName);

      console.log('✅ Transaction sent:', tx.hash);

      // 等待交易确认
      console.log('⏳ Waiting for confirmation...');
      const receipt = await tx.wait();

      console.log('✅ Transaction confirmed:', receipt.hash);
      setRegisterSuccess('✨ Successfully registered for the event! Your NFT ticket will be issued automatically.');
      setParticipantName('');

      // 重新加载活动数据（仅在成功时）
      setTimeout(() => {
        loadEvent();
      }, 2000);

    } catch (err) {
      console.error('❌ Error registering:', err);
      console.log('Error details:', {
        code: err.code,
        message: err.message,
        reason: err.reason,
        data: err.data
      });
      
      let errorMessage = 'Failed to register';
      
      if (err.code === 'ACTION_REJECTED' || err.code === 4001) {
        errorMessage = '❌ Transaction rejected by user';
      } else if (err.message?.includes('Already registered') || err.reason?.includes('Already registered')) {
        errorMessage = '⚠️ You have already registered for this event';
      } else if (err.message?.includes('Event is full') || err.reason?.includes('Event is full')) {
        errorMessage = '⚠️ Event is full, no more slots available';
      } else if (err.message?.includes('Event is not active') || err.reason?.includes('Event is not active')) {
        errorMessage = '⚠️ This event is not active';
      } else if (err.data?.message) {
        // handle contract revert errors
        const msg = err.data.message;
        if (msg.includes('Already registered')) {
          errorMessage = '⚠️ You have already registered for this event';
        } else if (msg.includes('execution reverted')) {
          // extract revert reason
          const match = msg.match(/execution reverted: (.+)/);
          if (match) {
            errorMessage = `❌ Contract Error: ${match[1]}`;
          } else {
            errorMessage = '❌ Transaction failed: ' + msg;
          }
        } else {
          errorMessage = '❌ ' + msg;
        }
      } else if (err.reason) {
        errorMessage = `❌ Contract error: ${err.reason}`;
      } else if (err.message) {
        errorMessage = '❌ ' + err.message;
      }
      
      setError(errorMessage);
      
      // scroll to the error area
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // do not reload event data to avoid navigation
    } finally {
      setRegistering(false);
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

  if (loadError || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <div className="text-6xl mb-4">😢</div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Event Not Found</h2>
          <p className="text-gray-600 mb-8">{loadError || 'The event you are looking for does not exist.'}</p>
          <button
            onClick={() => navigate('/events/browse')}
            className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-bold"
          >
            Back to Events
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
          onClick={() => navigate('/events/browse')}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-orange-600 font-medium transition-colors"
        >
          <span>←</span> Back to Events
        </button>

        <div className="bg-white rounded-2xl shadow-xl border-2 border-orange-200 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-red-600 p-6 text-white">
            <h1 className="text-3xl font-black mb-2">{event.title}</h1>
            <p className="text-orange-100">{event.description}</p>
          </div>

          <div className="p-8">
            {error && (
              <div className="mb-6 p-5 bg-red-50 border-2 border-red-400 rounded-lg text-red-700 animate-pulse">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">❌</span>
                  <div className="flex-1">
                    <p className="font-bold text-lg mb-1">Registration Error</p>
                    <p className="text-red-600">{error}</p>
                  </div>
                  <button
                    onClick={() => setError('')}
                    className="text-red-400 hover:text-red-600 font-bold text-xl"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            {registerSuccess && (
              <div className="mb-6 p-5 bg-green-50 border-2 border-green-400 rounded-lg text-green-700">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">✅</span>
                  <div className="flex-1">
                    <p className="font-bold text-lg mb-1">Success!</p>
                    <p className="text-green-600">{registerSuccess}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                <p className="text-gray-600 text-sm font-medium">📍 Location</p>
                <p className="text-xl font-bold text-gray-900">{event.location}</p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                <p className="text-gray-600 text-sm font-medium">👥 Participants</p>
                <p className="text-xl font-bold text-gray-900">{event.participants}/{event.maxParticipants}</p>
              </div>
            </div>

            {/* Sponsors info */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">💰 Sponsors</h2>
                {loadingSponsors && (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-orange-500 border-t-transparent"></div>
                )}
              </div>

              {sponsors && sponsors.length > 0 ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
                    <p className="text-gray-600 text-sm font-medium">Total Sponsorship</p>
                    <p className="text-2xl font-bold text-green-600">{getTotalSponsorship()} MON</p>
                  </div>

                  <div className="space-y-3">
                    {sponsors.map((sponsor, index) => (
                      <div
                        key={sponsor.id || index}
                        className="p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-orange-300 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-bold text-gray-900 text-lg">{sponsor.name}</p>
                            <p className="text-sm text-gray-500 mt-1">
                              {sponsor.wallet.slice(0, 6)}...{sponsor.wallet.slice(-4)}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(sponsor.sponsored_at * 1000).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-green-600">
                              {formatAmount(sponsor.amount)}
                            </p>
                            <p className="text-xs text-gray-500">MON</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-gray-50 rounded-lg border-2 border-gray-200">
                  <div className="text-4xl mb-2">💸</div>
                  <p className="text-gray-600">No sponsors yet</p>
                </div>
              )}
            </div>

            {isConnected ? (
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Your Name</label>
                  <input
                    type="text"
                    value={participantName}
                    onChange={(e) => setParticipantName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                    disabled={registering}
                  />
                </div>
                <button
                  onClick={handleRegister}
                  disabled={registering || !participantName.trim()}
                  className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {registering ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      Registering...
                    </>
                  ) : (
                    '🎫 Register for Event'
                  )}
                </button>
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700">
                <p className="font-medium">⚠️ Please connect your wallet to register</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
