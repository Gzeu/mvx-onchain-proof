/**
 * MultiversX OnChain Proof - Contract Service
 * Comprehensive TypeScript SDK integration for smart contract interaction
 * 
 * @author George Pricop
 * @version 0.3.0
 */

import {
  Address,
  SmartContract,
  ProxyNetworkProvider,
  Account,
  ContractFunction,
  BytesValue,
  OptionalValue,
  ResultsParser,
  Transaction,
  TransactionWatcher,
  GasLimit,
  Balance,
} from '@multiversx/sdk-core';
import {
  ExtensionProvider,
  WebWalletProvider,
  WalletConnectV2Provider,
  HWProvider,
} from '@multiversx/sdk-web-wallet-provider';
import { ApiNetworkProvider } from '@multiversx/sdk-network-providers';

// Contract ABI types
export interface ProofData {
  proof_text: string;
  timestamp: number;
  proof_id: string;
  metadata: string;
}

export interface DeploymentConfig {
  network: 'devnet' | 'testnet' | 'mainnet';
  contractAddress: string;
  proxyUrl: string;
  chainId: string;
}

export interface CertifyActionParams {
  proofText: string;
  proofId: string;
  metadata?: string;
}

export interface UpdateProofParams {
  proofId: string;
  newProofText: string;
  newMetadata?: string;
}

/**
 * MultiversX OnChain Proof Contract Service
 * Provides type-safe interaction with the smart contract
 */
export class ContractService {
  private contract: SmartContract;
  private provider: ProxyNetworkProvider | ApiNetworkProvider;
  private config: DeploymentConfig;
  private walletProvider: ExtensionProvider | WebWalletProvider | WalletConnectV2Provider | HWProvider | null = null;
  private resultsParser: ResultsParser;

  constructor(config: DeploymentConfig) {
    this.config = config;
    
    // Initialize network provider
    this.provider = new ProxyNetworkProvider(config.proxyUrl, {
      timeout: 10000,
    });
    
    // Initialize smart contract
    this.contract = new SmartContract({
      address: new Address(config.contractAddress),
    });
    
    // Initialize results parser
    this.resultsParser = new ResultsParser();
  }

  /**
   * Connect wallet provider
   */
  async connectWallet(providerType: 'extension' | 'webwallet' | 'walletconnect' | 'hardware'): Promise<void> {
    try {
      switch (providerType) {
        case 'extension':
          this.walletProvider = ExtensionProvider.getInstance();
          await this.walletProvider.init();
          break;
          
        case 'webwallet':
          this.walletProvider = new WebWalletProvider(
            this.getWebWalletUrl(this.config.network)
          );
          break;
          
        case 'walletconnect':
          this.walletProvider = new WalletConnectV2Provider({
            projectId: process.env.REACT_APP_WALLET_CONNECT_PROJECT_ID || '',
            metadata: {
              description: 'MultiversX OnChain Proof Application',
              url: 'https://github.com/Gzeu/mvx-onchain-proof',
              icons: ['https://avatars.githubusercontent.com/u/Gzeu'],
              name: 'OnChain Proof',
            },
          });
          await this.walletProvider.init();
          break;
          
        case 'hardware':
          this.walletProvider = new HWProvider();
          await this.walletProvider.init();
          break;
          
        default:
          throw new Error(`Unsupported wallet provider: ${providerType}`);
      }
      
      console.log(`Connected to ${providerType} wallet provider`);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  }

  /**
   * Get user address from connected wallet
   */
  async getUserAddress(): Promise<string> {
    if (!this.walletProvider) {
      throw new Error('Wallet not connected');
    }
    
    const address = await this.walletProvider.getAddress();
    return address;
  }

  /**
   * Get user account information
   */
  async getUserAccount(): Promise<Account> {
    const address = await this.getUserAddress();
    const account = new Account(new Address(address));
    const accountOnNetwork = await this.provider.getAccount(account.address);
    
    account.update(accountOnNetwork);
    return account;
  }

  // ============ CONTRACT READ METHODS ============

  /**
   * Get a specific proof for a user
   */
  async getProof(userAddress: string, proofId: string): Promise<ProofData | null> {
    try {
      const interaction = this.contract.methodsExplicit.getProof([
        new Address(userAddress),
        BytesValue.fromUTF8(proofId),
      ]);
      
      const query = interaction.buildQuery();
      const queryResponse = await this.provider.queryContract(query);
      
      if (queryResponse.isSuccess() && queryResponse.returnData.length > 0) {
        const result = this.resultsParser.parseQueryResponse(queryResponse, interaction.getEndpoint());
        return this.parseProofData(result[0]);
      }
      
      return null;
    } catch (error) {
      console.error('Error getting proof:', error);
      throw error;
    }
  }

  /**
   * Get all proofs for a user
   */
  async getUserProofs(userAddress: string): Promise<ProofData[]> {
    try {
      const interaction = this.contract.methodsExplicit.getUserProofs([
        new Address(userAddress),
      ]);
      
      const query = interaction.buildQuery();
      const queryResponse = await this.provider.queryContract(query);
      
      if (queryResponse.isSuccess() && queryResponse.returnData.length > 0) {
        const results = this.resultsParser.parseQueryResponse(queryResponse, interaction.getEndpoint());
        return results.map(result => this.parseProofData(result));
      }
      
      return [];
    } catch (error) {
      console.error('Error getting user proofs:', error);
      throw error;
    }
  }

  /**
   * Get all proof IDs for a user
   */
  async getUserProofIds(userAddress: string): Promise<string[]> {
    try {
      const interaction = this.contract.methodsExplicit.getUserProofIds([
        new Address(userAddress),
      ]);
      
      const query = interaction.buildQuery();
      const queryResponse = await this.provider.queryContract(query);
      
      if (queryResponse.isSuccess() && queryResponse.returnData.length > 0) {
        const results = this.resultsParser.parseQueryResponse(queryResponse, interaction.getEndpoint());
        return results.map(result => result.toString());
      }
      
      return [];
    } catch (error) {
      console.error('Error getting user proof IDs:', error);
      throw error;
    }
  }

  /**
   * Get the owner of a specific proof
   */
  async getProofOwner(proofId: string): Promise<string | null> {
    try {
      const interaction = this.contract.methodsExplicit.getProofOwner([
        BytesValue.fromUTF8(proofId),
      ]);
      
      const query = interaction.buildQuery();
      const queryResponse = await this.provider.queryContract(query);
      
      if (queryResponse.isSuccess() && queryResponse.returnData.length > 0) {
        const result = this.resultsParser.parseQueryResponse(queryResponse, interaction.getEndpoint());
        return result[0].toString();
      }
      
      return null;
    } catch (error) {
      console.error('Error getting proof owner:', error);
      throw error;
    }
  }

  /**
   * Get total number of proofs in the system
   */
  async getTotalProofs(): Promise<number> {
    try {
      const interaction = this.contract.methodsExplicit.getTotalProofs([]);
      
      const query = interaction.buildQuery();
      const queryResponse = await this.provider.queryContract(query);
      
      if (queryResponse.isSuccess() && queryResponse.returnData.length > 0) {
        const result = this.resultsParser.parseQueryResponse(queryResponse, interaction.getEndpoint());
        return parseInt(result[0].toString());
      }
      
      return 0;
    } catch (error) {
      console.error('Error getting total proofs:', error);
      throw error;
    }
  }

  /**
   * Get proof count for a specific user
   */
  async getUserProofCount(userAddress: string): Promise<number> {
    try {
      const interaction = this.contract.methodsExplicit.getUserProofCount([
        new Address(userAddress),
      ]);
      
      const query = interaction.buildQuery();
      const queryResponse = await this.provider.queryContract(query);
      
      if (queryResponse.isSuccess() && queryResponse.returnData.length > 0) {
        const result = this.resultsParser.parseQueryResponse(queryResponse, interaction.getEndpoint());
        return parseInt(result[0].toString());
      }
      
      return 0;
    } catch (error) {
      console.error('Error getting user proof count:', error);
      throw error;
    }
  }

  /**
   * Check if a proof exists
   */
  async proofExists(proofId: string): Promise<boolean> {
    try {
      const interaction = this.contract.methodsExplicit.proofExists([
        BytesValue.fromUTF8(proofId),
      ]);
      
      const query = interaction.buildQuery();
      const queryResponse = await this.provider.queryContract(query);
      
      if (queryResponse.isSuccess() && queryResponse.returnData.length > 0) {
        const result = this.resultsParser.parseQueryResponse(queryResponse, interaction.getEndpoint());
        return result[0].toString() === 'true';
      }
      
      return false;
    } catch (error) {
      console.error('Error checking if proof exists:', error);
      throw error;
    }
  }

  // ============ CONTRACT WRITE METHODS ============

  /**
   * Certify a new action (create proof)
   */
  async certifyAction(params: CertifyActionParams): Promise<string> {
    if (!this.walletProvider) {
      throw new Error('Wallet not connected');
    }

    try {
      const userAccount = await this.getUserAccount();
      
      const args = [
        BytesValue.fromUTF8(params.proofText),
        BytesValue.fromUTF8(params.proofId),
      ];
      
      // Add metadata if provided
      if (params.metadata) {
        args.push(new OptionalValue(BytesValue.fromUTF8(params.metadata)));
      } else {
        args.push(new OptionalValue());
      }
      
      const interaction = this.contract.methodsExplicit.certifyAction(args);
      
      const transaction = interaction
        .withSender(userAccount.address)
        .withGasLimit(new GasLimit(50000000))
        .withChainID(this.config.chainId)
        .buildTransaction();
      
      transaction.setNonce(userAccount.getNonceThenIncrement());
      
      await this.walletProvider.signTransaction(transaction);
      
      const txHash = await this.provider.sendTransaction(transaction);
      
      // Wait for transaction completion
      await this.waitForTransaction(txHash);
      
      return txHash;
    } catch (error) {
      console.error('Error certifying action:', error);
      throw error;
    }
  }

  /**
   * Update an existing proof
   */
  async updateProof(params: UpdateProofParams): Promise<string> {
    if (!this.walletProvider) {
      throw new Error('Wallet not connected');
    }

    try {
      const userAccount = await this.getUserAccount();
      
      const args = [
        BytesValue.fromUTF8(params.proofId),
        BytesValue.fromUTF8(params.newProofText),
      ];
      
      // Add metadata if provided
      if (params.newMetadata) {
        args.push(new OptionalValue(BytesValue.fromUTF8(params.newMetadata)));
      } else {
        args.push(new OptionalValue());
      }
      
      const interaction = this.contract.methodsExplicit.updateProof(args);
      
      const transaction = interaction
        .withSender(userAccount.address)
        .withGasLimit(new GasLimit(30000000))
        .withChainID(this.config.chainId)
        .buildTransaction();
      
      transaction.setNonce(userAccount.getNonceThenIncrement());
      
      await this.walletProvider.signTransaction(transaction);
      
      const txHash = await this.provider.sendTransaction(transaction);
      
      // Wait for transaction completion
      await this.waitForTransaction(txHash);
      
      return txHash;
    } catch (error) {
      console.error('Error updating proof:', error);
      throw error;
    }
  }

  // ============ UTILITY METHODS ============

  /**
   * Wait for transaction to complete
   */
  private async waitForTransaction(txHash: string): Promise<void> {
    const watcher = new TransactionWatcher(this.provider);
    await watcher.awaitCompleted(txHash);
  }

  /**
   * Parse proof data from contract response
   */
  private parseProofData(data: any): ProofData {
    return {
      proof_text: data.proof_text?.toString() || '',
      timestamp: parseInt(data.timestamp?.toString() || '0'),
      proof_id: data.proof_id?.toString() || '',
      metadata: data.metadata?.toString() || '',
    };
  }

  /**
   * Get web wallet URL based on network
   */
  private getWebWalletUrl(network: string): string {
    const urls = {
      devnet: 'https://devnet-wallet.multiversx.com',
      testnet: 'https://testnet-wallet.multiversx.com',
      mainnet: 'https://wallet.multiversx.com',
    };
    
    return urls[network as keyof typeof urls] || urls.devnet;
  }

  /**
   * Format proof data for display
   */
  formatProofForDisplay(proof: ProofData): string {
    const date = new Date(proof.timestamp * 1000).toLocaleString();
    return `${proof.proof_text} (Created: ${date})`;
  }

  /**
   * Generate proof verification URL
   */
  generateVerificationUrl(proofId: string, ownerAddress: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/verify?proofId=${encodeURIComponent(proofId)}&owner=${encodeURIComponent(ownerAddress)}`;
  }

  /**
   * Export proof data as JSON
   */
  exportProofAsJSON(proof: ProofData): string {
    return JSON.stringify({
      ...proof,
      exportedAt: new Date().toISOString(),
      network: this.config.network,
      contractAddress: this.config.contractAddress,
    }, null, 2);
  }

  /**
   * Validate proof ID format
   */
  validateProofId(proofId: string): { valid: boolean; error?: string } {
    if (!proofId || proofId.trim().length === 0) {
      return { valid: false, error: 'Proof ID cannot be empty' };
    }
    
    if (proofId.length > 100) {
      return { valid: false, error: 'Proof ID cannot exceed 100 characters' };
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(proofId)) {
      return { valid: false, error: 'Proof ID can only contain alphanumeric characters, underscores, and hyphens' };
    }
    
    return { valid: true };
  }

  /**
   * Validate proof text format
   */
  validateProofText(proofText: string): { valid: boolean; error?: string } {
    if (!proofText || proofText.trim().length === 0) {
      return { valid: false, error: 'Proof text cannot be empty' };
    }
    
    if (proofText.length > 500) {
      return { valid: false, error: 'Proof text cannot exceed 500 characters' };
    }
    
    return { valid: true };
  }
}

// ============ FACTORY FUNCTIONS ============

/**
 * Create contract service for DevNet
 */
export function createDevNetContractService(contractAddress: string): ContractService {
  return new ContractService({
    network: 'devnet',
    contractAddress,
    proxyUrl: 'https://devnet-gateway.multiversx.com',
    chainId: 'D',
  });
}

/**
 * Create contract service for TestNet
 */
export function createTestNetContractService(contractAddress: string): ContractService {
  return new ContractService({
    network: 'testnet',
    contractAddress,
    proxyUrl: 'https://testnet-gateway.multiversx.com',
    chainId: 'T',
  });
}

/**
 * Create contract service for MainNet
 */
export function createMainNetContractService(contractAddress: string): ContractService {
  return new ContractService({
    network: 'mainnet',
    contractAddress,
    proxyUrl: 'https://gateway.multiversx.com',
    chainId: '1',
  });
}

// ============ HOOKS FOR REACT INTEGRATION ============

/**
 * React hook for contract service (if using React)
 */
export function useContractService(config: DeploymentConfig) {
  const [service] = React.useState(() => new ContractService(config));
  return service;
}

export default ContractService;