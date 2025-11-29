import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import Navbar from '../../layout/Navbar.jsx';
import Footer from '../../layout/Footer.jsx';

export default function MyTickets() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isConnected) {
      loadMyTickets();
    } else {
      setLoading(false);
    }
  }, [isConnected, address]);

  const loadMyTickets = async () => {
    try {
      setLoading(true);
      // TODO: Fetch user's tickets from contract
      setTickets([]);
    } catch (err) {
      console.error('Error loading tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <div className="text-6xl mb-4">🔐</div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Connect Wallet</h2>
          <p className="text-gray-600 mb-8">Please connect your wallet to view your tickets</p>
          <button
            onClick={() => navigate('/')}
            className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-bold"
          >
            Back to Home
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-12">
        <button
          onClick={() => navigate('/')}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-orange-600 font-medium transition-colors"
        >
          <span>←</span> Back to Home
        </button>

        <div className="bg-white rounded-2xl shadow-xl border-2 border-orange-200 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-red-600 p-6 text-white">
            <h1 className="text-3xl font-black mb-2">🎫 My Tickets</h1>
            <p className="text-orange-100">Your NFT event tickets</p>
          </div>

          <div className="p-8">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
                <p className="mt-4 text-gray-600 font-medium">Loading your tickets...</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎫</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No Tickets Yet</h3>
                <p className="text-gray-600 mb-6">Register for an event to get your NFT ticket!</p>
                <button
                  onClick={() => navigate('/events/browse')}
                  className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-bold hover:shadow-lg transition-all"
                >
                  Browse Events
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                    className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg border-2 border-orange-200 p-6 cursor-pointer hover:shadow-lg transition-all transform hover:scale-105"
                  >
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{ticket.eventTitle}</h3>
                    <p className="text-gray-600 mb-4">Ticket #{ticket.id.slice(0, 8)}</p>
                    <div className="space-y-2 text-sm text-gray-700">
                      <p>📍 {ticket.location}</p>
                      <p>🎫 Status: {ticket.used ? 'Used' : 'Valid'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
