import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from './components/Dashboard';
import LandingPage from './components/LandingPage';
import ProofDetails from './components/ProofDetails';
import Explorer from './components/Explorer';
import './styles/globals.css';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="App min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/proof/:proofId" element={<ProofDetails />} />
            <Route path="/verify/:proofId" element={<ProofDetails />} />
            <Route path="/explorer" element={<Explorer />} />
            {/* Fallback route */}
            <Route path="*" element={<LandingPage />} />
          </Routes>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;