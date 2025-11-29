import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import Navbar from '../../layout/Navbar.jsx';
import Footer from '../../layout/Footer.jsx';
import { HACKATHON_ABI } from '../../config/contractABI.js';
import { getProviderAndSigner } from '../../services/walletService.js';

export default function MyEvents() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSponsorModal, setShowSponsorModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [sponsorForm, setSponsorForm] = useState({ name: '', amount: '' });
  const [sponsoring, setSponsoring] = useState(false);

  const HACKATHON_CONTRACT_ADDRESS = import.meta.env.VITE_HACKATHON_CONTRACT_ADDRESS;

  useEffect(() => {
    if (isConnected) {
      loadMyEvents();
    } else {
      setLoading(false);
    }
  }, [isConnected, address]);

  const loadMyEvents = async () => {
    try {
      setLoading(true);
      // 使用专门的组织者接口
      const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/events/organizer?organizer=${address}`;
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      const result = await response.json();
      
      if (result.code === 0 && result.data) {
        // 将后端返回的数据格式转换为前端期望的格式
        const transformedEvents = result.data.map(event => ({
          id: event.id,
          eventId: event.event_id,
          organizer: event.organizer,
          title: event.title,
          description: event.description,
          startTime: event.start_time,
          endTime: event.end_time,
          location: event.location,
          maxParticipants: event.max_participants,
          participants: event.participant_count,
          active: event.active,
          createdAt: event.created_at,
          updatedAt: event.updated_at,
          syncedAt: event.synced_at,
        }));
        setEvents(transformedEvents);
      }
    } catch (err) {
      console.error('Error loading events:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEventStatus = (event) => {
    const now = Date.now() / 1000;
    if (!event.active) return { text: '已关闭', color: 'gray' };
    if (now < event.startTime) return { text: '未开始', color: 'blue' };
    if (now >= event.startTime && now <= event.endTime) return { text: '进行中', color: 'green' };
    return { text: '已结束', color: 'orange' };
  };

  const handleOpenSponsorModal = (event) => {
    setSelectedEvent(event);
    setSponsorForm({ name: '', amount: '' });
    setShowSponsorModal(true);
  };

  const handleCloseSponsorModal = () => {
    setShowSponsorModal(false);
    setSelectedEvent(null);
    setSponsorForm({ name: '', amount: '' });
  };

  const handleAddSponsor = async () => {
    if (!sponsorForm.name.trim()) {
      alert('请输入赞助商名称');
      return;
    }
    if (!sponsorForm.amount || parseFloat(sponsorForm.amount) <= 0) {
      alert('请输入有效的赞助金额');
      return;
    }

    try {
      setSponsoring(true);
      const { signer } = await getProviderAndSigner();
      const contract = new ethers.Contract(
        HACKATHON_CONTRACT_ADDRESS,
        HACKATHON_ABI,
        signer
      );

      // 将 MON 转换为 Wei
      const amountInWei = ethers.parseEther(sponsorForm.amount);

      console.log('Adding sponsor:', {
        eventId: selectedEvent.eventId,
        name: sponsorForm.name,
        amount: sponsorForm.amount,
      });

      const tx = await contract.addSponsor(
        selectedEvent.eventId,
        sponsorForm.name,
        { value: amountInWei }
      );

      console.log('Transaction sent:', tx.hash);
      await tx.wait();
      console.log('Transaction confirmed!');

      alert('赞助添加成功！');
      handleCloseSponsorModal();
      
      // 刷新活动列表
      await loadMyEvents();
    } catch (error) {
      console.error('Error adding sponsor:', error);
      if (error.code === 'ACTION_REJECTED') {
        alert('用户取消了交易');
      } else {
        alert(`添加赞助失败: ${error.message}`);
      }
    } finally {
      setSponsoring(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <div className="text-6xl mb-4">🔐</div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Connect Wallet</h2>
          <p className="text-gray-600 mb-8">Please connect your wallet to view your events</p>
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
            <h1 className="text-3xl font-black mb-2">🎭 My Events</h1>
            <p className="text-orange-100">Events you've created</p>
          </div>

          <div className="p-8">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
                <p className="mt-4 text-gray-600 font-medium">Loading your events...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📭</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No Events Yet</h3>
                <p className="text-gray-600 mb-6">Create your first event to get started!</p>
                <button
                  onClick={() => navigate('/events/create')}
                  className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-bold hover:shadow-lg transition-all"
                >
                  Create Event
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {events.map((event) => {
                  const status = getEventStatus(event);
                  return (
                    <div
                      key={event.id}
                      className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg border-2 border-orange-200 p-6"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xl font-bold text-gray-900">{event.title}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          status.color === 'green' ? 'bg-green-100 text-green-700' :
                          status.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                          status.color === 'orange' ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {status.text}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-4 line-clamp-2">{event.description}</p>
                      <div className="space-y-2 text-sm text-gray-700 mb-4">
                        <p>📍 {event.location}</p>
                        <p>👥 {event.participants}/{event.maxParticipants} 参与者</p>
                        <p>🕐 {formatDate(event.startTime)}</p>
                        <p className="text-xs text-gray-500">Event ID: #{event.eventId}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/events/${event.eventId}/checkin`)}
                          className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg font-bold hover:bg-orange-600 transition-all"
                        >
                          签到管理
                        </button>
                        <button
                          onClick={() => handleOpenSponsorModal(event)}
                          className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition-all"
                        >
                          💰 添加赞助
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 赞助商对话框 */}
      {showSponsorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">💰 添加赞助商</h2>
              <button
                onClick={handleCloseSponsorModal}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">活动：</p>
              <p className="font-bold text-gray-900">{selectedEvent?.title}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  赞助商名称 *
                </label>
                <input
                  type="text"
                  value={sponsorForm.name}
                  onChange={(e) => setSponsorForm({ ...sponsorForm, name: e.target.value })}
                  placeholder="请输入赞助商名称"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
                  disabled={sponsoring}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  赞助金额 (MON) *
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={sponsorForm.amount}
                  onChange={(e) => setSponsorForm({ ...sponsorForm, amount: e.target.value })}
                  placeholder="0.0"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
                  disabled={sponsoring}
                />
                <p className="text-xs text-gray-500 mt-1">
                  请输入要赞助的 MON 代币数量
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCloseSponsorModal}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-all"
                disabled={sponsoring}
              >
                取消
              </button>
              <button
                onClick={handleAddSponsor}
                disabled={sponsoring}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sponsoring ? '处理中...' : '确认赞助'}
              </button>
            </div>

            {sponsoring && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700 text-center">
                  ⏳ 正在提交交易，请在钱包中确认...
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
