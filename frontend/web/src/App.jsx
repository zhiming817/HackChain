import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import Home from './pages/events/Home.jsx';
import CreateEvent from './pages/events/CreateEvent.jsx';
import EventList from './pages/events/EventList.jsx';
import EventDetail from './pages/events/EventDetail.jsx';
import MyEvents from './pages/events/MyEvents.jsx';
import MyTickets from './pages/events/MyTickets.jsx';
import TicketManagement from './pages/events/TicketManagement.jsx';
import CheckInScanner from './pages/events/CheckInScanner.jsx';
import TicketDetail from './pages/tickets/TicketDetail.jsx';
import Debug from './pages/Debug.jsx';

const queryClient = new QueryClient();

// Somnia network configuration - ONLY 50312
const somniaTestnet = {
  id: 50312,
  name: 'Somnia Testnet',
  nativeCurrency: { name: 'Somnia', symbol: 'SOMNIA', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://dream-rpc.somnia.network'] },
    public: { http: ['https://dream-rpc.somnia.network'] },
  },
  blockExplorers: {
    default: { name: 'Somnia Explorer', url: 'https://somnia-testnet.explorer.com' },
  },
};

const config = createConfig({
  chains: [somniaTestnet],
  connectors: [injected()],
  transports: {
    [somniaTestnet.id]: http(import.meta.env.VITE_SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network'),
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <HashRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/events/create" element={<CreateEvent />} />
            <Route path="/events/browse" element={<EventList />} />
            <Route path="/events/:eventId" element={<EventDetail />} />
            <Route path="/events/:eventId/checkin" element={<CheckInScanner />} />
            <Route path="/events/my" element={<MyEvents />} />
            <Route path="/events/tickets" element={<MyTickets />} />
            <Route path="/tickets/:ticketId" element={<TicketDetail />} />
            <Route path="/tickets/:ticketId/manage" element={<TicketManagement />} />
            <Route path="/debug" element={<Debug />} />
          </Routes>
        </HashRouter>
      </WagmiProvider>
    </QueryClientProvider>
  );
}

export default App;