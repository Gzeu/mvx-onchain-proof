// MultiversX OnChain Proof - Type Definitions

export interface ProofData {
  proof_text: string;
  timestamp: number;
  proof_id: string;
  metadata: string;
}

export interface UserProofResponse {
  proofs: ProofData[];
  total_count: number;
}

export interface CreateProofRequest {
  proof_text: string;
  proof_id: string;
  metadata?: string;
}

export interface UpdateProofRequest {
  proof_id: string;
  new_proof_text: string;
  new_metadata?: string;
}

export interface ProofExistsResponse {
  exists: boolean;
}

export interface ProofOwnerResponse {
  owner?: string;
}

export interface ProofStatsResponse {
  user_proof_count: number;
  total_proofs: number;
}

// Wallet types
export interface WalletProvider {
  id: string;
  name: string;
  iconUrl: string;
  isInstalled: boolean;
}

export interface WalletState {
  isConnected: boolean;
  address?: string;
  balance?: string;
  provider?: WalletProvider;
  isLoading: boolean;
  error?: string;
}

// Transaction types
export interface TransactionState {
  isLoading: boolean;
  hash?: string;
  status?: 'pending' | 'success' | 'failed';
  error?: string;
}

// UI types
export interface ProofTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  category: ProofCategory;
  icon: string;
  color: string;
}

export type ProofCategory = 
  | 'certificate' 
  | 'badge' 
  | 'achievement' 
  | 'event' 
  | 'education' 
  | 'professional'
  | 'verification'
  | 'custom';

export interface ProofFilter {
  category?: ProofCategory;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'timestamp' | 'proof_text' | 'proof_id';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

// Network configuration
export interface NetworkConfig {
  chainId: string;
  name: string;
  egldLabel: string;
  walletConnectDeepLink: string;
  walletConnectBridgeAddresses: string[];
  walletAddress: string;
  apiAddress: string;
  explorerAddress: string;
  apiTimeout: number;
}

// Smart contract interaction
export interface ContractConfig {
  address: string;
  abi: any[];
}

export interface SmartContractCall {
  func: string;
  args: any[];
  value?: string;
  gasLimit?: number;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

export interface ApiError {
  message: string;
  code?: number;
  details?: any;
}

// Form types
export interface CreateProofFormData {
  proofText: string;
  proofId: string;
  metadata: Record<string, any>;
  template?: string;
}

export interface UpdateProofFormData {
  proofText: string;
  metadata: Record<string, any>;
}

// Notification types
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  timestamp: number;
  autoHide?: boolean;
}

// Theme types
export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeConfig {
  mode: ThemeMode;
  primaryColor: string;
  accentColor: string;
}

// Verification types
export interface VerificationResult {
  isValid: boolean;
  proof?: ProofData;
  owner?: string;
  verificationUrl: string;
  qrCode?: string;
}

// Export utility type
export interface ExportOptions {
  format: 'json' | 'csv' | 'pdf' | 'image';
  includeMetadata: boolean;
  includeQR: boolean;
}

// Search types
export interface SearchResult {
  proofs: ProofData[];
  totalCount: number;
  searchTime: number;
}

export interface SearchQuery {
  text?: string;
  category?: ProofCategory;
  owner?: string;
  dateRange?: {
    from: string;
    to: string;
  };
  limit?: number;
  offset?: number;
}

// Statistics types
export interface ProofStatistics {
  totalProofs: number;
  proofsToday: number;
  proofsThisWeek: number;
  proofsThisMonth: number;
  categoryCounts: Record<ProofCategory, number>;
  topUsers: Array<{
    address: string;
    count: number;
  }>;
  recentActivity: Array<{
    proof_id: string;
    action: 'created' | 'updated';
    timestamp: number;
    user: string;
  }>;
}

// Event types for real-time updates
export interface ProofEvent {
  type: 'proof_created' | 'proof_updated';
  proof_id: string;
  user: string;
  timestamp: number;
  data: ProofData;
}

// Component prop types
export interface ProofCardProps {
  proof: ProofData;
  onEdit?: (proof: ProofData) => void;
  onShare?: (proof: ProofData) => void;
  onDelete?: (proofId: string) => void;
  showActions?: boolean;
  compact?: boolean;
}

export interface ProofListProps {
  proofs: ProofData[];
  isLoading?: boolean;
  error?: string;
  onEdit?: (proof: ProofData) => void;
  onShare?: (proof: ProofData) => void;
  onDelete?: (proofId: string) => void;
  emptyStateMessage?: string;
}

export interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (providerId: string) => void;
  providers: WalletProvider[];
  isConnecting?: boolean;
  error?: string;
}