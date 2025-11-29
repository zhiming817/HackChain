import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import QRCode from 'qrcode';
import Navbar from '../../layout/Navbar.jsx';
import Footer from '../../layout/Footer.jsx';

export default function MyTickets() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [showQRModal, setShowQRModal] = useState(false);

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
      const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/tickets?holder=${address}`;
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error('Failed to fetch tickets');
      }
      
      const result = await response.json();
      
      if (result.code === 0 && result.data) {
        setTickets(result.data);
      } else {
        setTickets([]);
      }
    } catch (err) {
      console.error('Error loading tickets:', err);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleShowQRCode = async (ticket) => {
    try {
      setSelectedTicket(ticket);
      // 生成包含门票信息的 JSON 字符串作为二维码内容
      const qrData = JSON.stringify({
        tokenId: ticket.token_id,
        eventId: ticket.event_id,
        holder: ticket.holder,
        eventTitle: ticket.event_title,
        location: ticket.location,
        issuedAt: ticket.issued_at,
      });
      
      // 生成二维码
      const url = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      
      setQrCodeUrl(url);
      setShowQRModal(true);
    } catch (err) {
      console.error('Error generating QR code:', err);
      alert('生成二维码失败');
    }
  };

  const handleCloseQRModal = () => {
    setShowQRModal(false);
    setSelectedTicket(null);
    setQrCodeUrl('');
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
                    className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg border-2 border-orange-200 p-6 hover:shadow-lg transition-all"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold text-gray-900">{ticket.event_title}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        ticket.used 
                          ? 'bg-gray-200 text-gray-600' 
                          : 'bg-green-100 text-green-600'
                      }`}>
                        {ticket.used ? '已使用' : '有效'}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-700 mb-4">
                      <p className="flex items-center gap-2">
                        <span className="text-lg">🎫</span>
                        <span className="font-medium">Token ID:</span>
                        <span className="font-mono text-orange-600">#{ticket.token_id}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="text-lg">📍</span>
                        <span>{ticket.location}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="text-lg">📅</span>
                        <span>{formatTime(ticket.start_time)} - {formatTime(ticket.end_time)}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="text-lg">⏰</span>
                        <span className="text-xs text-gray-500">发放时间: {formatTime(ticket.issued_at)}</span>
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleShowQRCode(ticket)}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
                      >
                        <span>📱</span>
                        <span>查看二维码</span>
                      </button>
                      <button
                        onClick={() => navigate(`/events/${ticket.event_id}`)}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
                      >
                        查看活动
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 二维码弹窗 */}
      {showQRModal && selectedTicket && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleCloseQRModal}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 标题栏 */}
            <div className="bg-gradient-to-r from-orange-500 to-red-600 p-6 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{selectedTicket.event_title}</h2>
                  <p className="text-orange-100 text-sm">NFT 门票二维码</p>
                </div>
                <button
                  onClick={handleCloseQRModal}
                  className="text-white hover:text-gray-200 text-3xl font-bold leading-none"
                >
                  ×
                </button>
              </div>
            </div>

            {/* 二维码区域 */}
            <div className="p-8">
              <div className="bg-white rounded-lg p-4 border-2 border-gray-200 mb-6">
                <img 
                  src={qrCodeUrl} 
                  alt="Ticket QR Code" 
                  className="w-full h-auto"
                />
              </div>

              {/* 门票信息 */}
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Token ID</span>
                  <span className="font-mono font-bold text-orange-600">#{selectedTicket.token_id}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">持有者</span>
                  <span className="font-mono text-xs">{selectedTicket.holder.slice(0, 6)}...{selectedTicket.holder.slice(-4)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">地点</span>
                  <span className="font-medium">{selectedTicket.location}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">时间</span>
                  <span className="text-xs">{formatTime(selectedTicket.start_time)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">状态</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    selectedTicket.used 
                      ? 'bg-gray-200 text-gray-600' 
                      : 'bg-green-100 text-green-600'
                  }`}>
                    {selectedTicket.used ? '已使用' : '有效'}
                  </span>
                </div>
              </div>

              {/* 提示信息 */}
              <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                <p className="text-sm text-blue-700">
                  💡 请在活动签到时出示此二维码
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
