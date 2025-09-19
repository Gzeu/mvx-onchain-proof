import React, { useState, useEffect } from 'react';
import { ProofData, WalletState, TransactionState } from '../types/proof';
import { walletService } from '../services/walletService';
import { contractService } from '../services/contractService';
import ProofCard from './ProofCard';
import WalletConnectModal from './WalletConnectModal';
import CreateProofModal from './CreateProofModal';
import { 
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ChartBarIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

const Dashboard: React.FC = () => {
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    isLoading: true
  });
  
  const [proofs, setProofs] = useState<ProofData[]>([]);
  const [isLoadingProofs, setIsLoadingProofs] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ userCount: 0, totalCount: 0 });
  const [transaction, setTransaction] = useState<TransactionState>({ isLoading: false });

  // Initialize wallet connection on mount
  useEffect(() => {
    initializeWallet();
  }, []);

  // Load user proofs when wallet connects
  useEffect(() => {
    if (walletState.isConnected && walletState.address) {
      loadUserProofs();
      loadStats();
    }
  }, [walletState.isConnected, walletState.address]);

  const initializeWallet = async () => {
    try {
      const state = await walletService.autoReconnect();
      setWalletState(state);
    } catch (error) {
      console.error('Auto-reconnect failed:', error);
      setWalletState({ isConnected: false, isLoading: false });
    }
  };

  const handleWalletConnect = async (providerId: string) => {
    try {
      setWalletState(prev => ({ ...prev, isLoading: true }));
      const state = await walletService.connectWallet(providerId);
      setWalletState(state);
      setShowWalletModal(false);
    } catch (error) {
      console.error('Wallet connection failed:', error);
      setWalletState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Connection failed'
      }));
    }
  };

  const handleWalletDisconnect = async () => {
    try {
      await walletService.disconnectWallet();
      setWalletState({ isConnected: false, isLoading: false });
      setProofs([]);
      setStats({ userCount: 0, totalCount: 0 });
    } catch (error) {
      console.error('Wallet disconnect failed:', error);
    }
  };

  const loadUserProofs = async () => {
    if (!walletState.address) return;
    
    try {
      setIsLoadingProofs(true);
      const userProofs = await contractService.getUserProofs(walletState.address);
      setProofs(userProofs);
    } catch (error) {
      console.error('Failed to load proofs:', error);
    } finally {
      setIsLoadingProofs(false);
    }
  };

  const loadStats = async () => {
    if (!walletState.address) return;
    
    try {
      const [userCount, totalCount] = await Promise.all([
        contractService.getUserProofCount(walletState.address),
        contractService.getTotalProofs()
      ]);
      
      setStats({ userCount, totalCount });
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleCreateProof = async (proofData: { proof_text: string; proof_id: string; metadata?: string }) => {
    if (!walletState.address) return;
    
    try {
      setTransaction({ isLoading: true });
      
      const txHash = await contractService.createProof({
        proof_text: proofData.proof_text,
        proof_id: proofData.proof_id,
        metadata: proofData.metadata
      });
      
      setTransaction({ isLoading: true, hash: txHash, status: 'pending' });
      
      // Wait for transaction completion
      await contractService.waitForTransaction(txHash);
      
      setTransaction({ isLoading: false, hash: txHash, status: 'success' });
      
      // Refresh proofs and stats
      await loadUserProofs();
      await loadStats();
      
      setShowCreateModal(false);
      
      // Clear transaction state after 5 seconds
      setTimeout(() => {
        setTransaction({ isLoading: false });
      }, 5000);
      
    } catch (error) {
      console.error('Create proof failed:', error);
      setTransaction({ 
        isLoading: false, 
        status: 'failed',
        error: error instanceof Error ? error.message : 'Creation failed'
      });
    }
  };

  const handleEditProof = async (proof: ProofData) => {
    // This would open an edit modal - simplified for now
    console.log('Edit proof:', proof);
  };

  const handleShareProof = async (proof: ProofData) => {
    const verificationUrl = `${window.location.origin}/verify/${proof.proof_id}`;
    
    try {
      await navigator.clipboard.writeText(verificationUrl);
      alert('Verification URL copied to clipboard!');
    } catch {
      alert(`Verification URL: ${verificationUrl}`);
    }
  };

  const filteredProofs = proofs.filter(proof => 
    searchQuery === '' || 
    proof.proof_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    proof.proof_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (walletState.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading wallet connection...</p>
        </div>
      </div>
    );
  }

  if (!walletState.isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-6xl mb-6">🏷️</div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            MVX OnChain Proof
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Connect your wallet to create and manage blockchain certificates and badges on MultiversX.
          </p>
          <button
            onClick={() => setShowWalletModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Connect Wallet
          </button>
        </div>
        
        <WalletConnectModal
          isOpen={showWalletModal}
          onClose={() => setShowWalletModal(false)}
          onConnect={handleWalletConnect}
          providers={walletService.getAvailableProviders()}
          isConnecting={walletState.isLoading}
          error={walletState.error}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="text-2xl">🏷️</div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  MVX OnChain Proof
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Dashboard
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {walletState.address?.substring(0, 8)}...{walletState.address?.slice(-6)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {parseFloat(walletState.balance || '0').toFixed(4)} EGLD
                </p>
              </div>
              <button
                onClick={handleWalletDisconnect}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <DocumentTextIcon className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.userCount}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Your Proofs</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalCount}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Platform Proofs</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="text-2xl mr-4">⛓️</div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">DevNet</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Network Status</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={transaction.isLoading}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Proof
            </button>
            
            <button
              onClick={loadUserProofs}
              disabled={isLoadingProofs}
              className="inline-flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
            >
              <ArrowPathIcon className={`h-4 w-4 mr-2 ${isLoadingProofs ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search proofs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full sm:w-64 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Transaction Status */}
        {transaction.isLoading && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center">
              <ArrowPathIcon className="h-5 w-5 text-blue-500 animate-spin mr-3" />
              <div>
                <p className="text-blue-800 dark:text-blue-200 font-medium">
                  Transaction in progress...
                </p>
                {transaction.hash && (
                  <p className="text-blue-600 dark:text-blue-400 text-sm mt-1">
                    Hash: {transaction.hash.substring(0, 20)}...
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {transaction.status === 'success' && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center">
              <div className="text-green-500 mr-3">✅</div>
              <div>
                <p className="text-green-800 dark:text-green-200 font-medium">
                  Transaction completed successfully!
                </p>
                {transaction.hash && (
                  <a 
                    href={`https://devnet-explorer.multiversx.com/transactions/${transaction.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 dark:text-green-400 text-sm hover:underline"
                  >
                    View on Explorer →
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {transaction.status === 'failed' && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center">
              <div className="text-red-500 mr-3">❌</div>
              <div>
                <p className="text-red-800 dark:text-red-200 font-medium">
                  Transaction failed
                </p>
                <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                  {transaction.error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Proofs Grid */}
        {isLoadingProofs ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : filteredProofs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProofs.map((proof) => (
              <ProofCard
                key={proof.proof_id}
                proof={proof}
                onEdit={handleEditProof}
                onShare={handleShareProof}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📜</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {searchQuery ? 'No matching proofs found' : 'No proofs yet'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {searchQuery 
                ? 'Try adjusting your search terms'
                : 'Create your first blockchain certificate or badge'
              }
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Create Your First Proof
              </button>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      <WalletConnectModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onConnect={handleWalletConnect}
        providers={walletService.getAvailableProviders()}
        isConnecting={walletState.isLoading}
        error={walletState.error}
      />
      
      <CreateProofModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateProof}
        isCreating={transaction.isLoading}
      />
    </div>
  );
};

export default Dashboard;