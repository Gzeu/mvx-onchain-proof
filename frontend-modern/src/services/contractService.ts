// MultiversX OnChain Proof - Smart Contract Service
import { 
  SmartContract,
  Address,
  ContractFunction,
  Transaction,
  TransactionPayload,
  GasLimit,
  U64Value,
  BigUIntValue,
  StringValue,
  OptionalValue,
  ResultsParser
} from '@multiversx/sdk-core';
import { ApiNetworkProvider } from '@multiversx/sdk-network-providers';
import { ProofData, CreateProofRequest, UpdateProofRequest } from '../types/proof';
import { walletService } from './walletService';

export class ContractService {
  private static instance: ContractService;
  private contract: SmartContract;
  private networkProvider: ApiNetworkProvider;
  private resultsParser: ResultsParser;

  private constructor(contractAddress: string, apiUrl: string) {
    this.contract = new SmartContract({
      address: new Address(contractAddress)
    });
    
    this.networkProvider = new ApiNetworkProvider(apiUrl, {
      timeout: 5000
    });
    
    this.resultsParser = new ResultsParser();
  }

  public static getInstance(
    contractAddress: string = process.env.REACT_APP_CONTRACT_ADDRESS || '',
    apiUrl: string = process.env.REACT_APP_PROXY_URL || 'https://devnet-api.multiversx.com'
  ): ContractService {
    if (!ContractService.instance) {
      ContractService.instance = new ContractService(contractAddress, apiUrl);
    }
    return ContractService.instance;
  }

  // Create new proof on blockchain
  public async createProof(request: CreateProofRequest): Promise<string> {
    const walletState = walletService.getCurrentWalletState();
    if (!walletState.isConnected || !walletState.address) {
      throw new Error('Wallet not connected');
    }

    try {
      const func = new ContractFunction('certify_action');
      const args = [
        new StringValue(request.proof_text),
        new StringValue(request.proof_id)
      ];
      
      // Add metadata if provided
      if (request.metadata) {
        args.push(new StringValue(request.metadata));
      }

      const transaction = this.contract.call({
        func,
        args,
        gasLimit: new GasLimit(20_000_000), // 20M gas limit
        caller: new Address(walletState.address)
      });

      // Sign and send transaction
      const txHash = await walletService.signAndSendTransaction(transaction);
      return txHash;
      
    } catch (error) {
      console.error('Create proof error:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to create proof'
      );
    }
  }

  // Update existing proof
  public async updateProof(request: UpdateProofRequest): Promise<string> {
    const walletState = walletService.getCurrentWalletState();
    if (!walletState.isConnected || !walletState.address) {
      throw new Error('Wallet not connected');
    }

    try {
      const func = new ContractFunction('update_proof');
      const args = [
        new StringValue(request.proof_id),
        new StringValue(request.new_proof_text)
      ];
      
      // Add metadata if provided
      if (request.new_metadata) {
        args.push(new StringValue(request.new_metadata));
      }

      const transaction = this.contract.call({
        func,
        args,
        gasLimit: new GasLimit(15_000_000), // 15M gas limit for updates
        caller: new Address(walletState.address)
      });

      const txHash = await walletService.signAndSendTransaction(transaction);
      return txHash;
      
    } catch (error) {
      console.error('Update proof error:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to update proof'
      );
    }
  }

  // Get single proof by user and proof_id
  public async getProof(userAddress: string, proofId: string): Promise<ProofData | null> {
    try {
      const query = this.contract.createQuery({
        func: new ContractFunction('getProof'),
        args: [
          new Address(userAddress),
          new StringValue(proofId)
        ]
      });

      const response = await this.networkProvider.queryContract(query);
      
      if (!response.returnData || response.returnData.length === 0) {
        return null;
      }

      // Parse the response
      const decoded = this.resultsParser.parseQueryResponse(response, {
        values: [
          {
            name: 'proof_data',
            type: 'optional<ProofData>'
          }
        ]
      });

      if (decoded && decoded[0]) {
        const proofData = decoded[0];
        return {
          proof_text: proofData.proof_text.toString(),
          timestamp: parseInt(proofData.timestamp.toString()),
          proof_id: proofData.proof_id.toString(),
          metadata: proofData.metadata.toString()
        };
      }

      return null;
      
    } catch (error) {
      console.error('Get proof error:', error);
      return null;
    }
  }

  // Get all proofs for a user
  public async getUserProofs(userAddress: string): Promise<ProofData[]> {
    try {
      const query = this.contract.createQuery({
        func: new ContractFunction('getUserProofs'),
        args: [new Address(userAddress)]
      });

      const response = await this.networkProvider.queryContract(query);
      
      if (!response.returnData || response.returnData.length === 0) {
        return [];
      }

      // Parse multiple proofs response
      const decoded = this.resultsParser.parseQueryResponse(response, {
        values: [{
          name: 'proofs',
          type: 'list<ProofData>'
        }]
      });

      if (decoded && decoded[0] && Array.isArray(decoded[0])) {
        return decoded[0].map((proofData: any) => ({
          proof_text: proofData.proof_text.toString(),
          timestamp: parseInt(proofData.timestamp.toString()),
          proof_id: proofData.proof_id.toString(),
          metadata: proofData.metadata.toString()
        }));
      }

      return [];
      
    } catch (error) {
      console.error('Get user proofs error:', error);
      return [];
    }
  }

  // Check if proof exists
  public async proofExists(proofId: string): Promise<boolean> {
    try {
      const query = this.contract.createQuery({
        func: new ContractFunction('proofExists'),
        args: [new StringValue(proofId)]
      });

      const response = await this.networkProvider.queryContract(query);
      
      if (!response.returnData || response.returnData.length === 0) {
        return false;
      }

      const decoded = this.resultsParser.parseQueryResponse(response, {
        values: [{ name: 'exists', type: 'bool' }]
      });

      return decoded && decoded[0] === true;
      
    } catch (error) {
      console.error('Proof exists check error:', error);
      return false;
    }
  }

  // Get proof owner
  public async getProofOwner(proofId: string): Promise<string | null> {
    try {
      const query = this.contract.createQuery({
        func: new ContractFunction('getProofOwner'),
        args: [new StringValue(proofId)]
      });

      const response = await this.networkProvider.queryContract(query);
      
      if (!response.returnData || response.returnData.length === 0) {
        return null;
      }

      const decoded = this.resultsParser.parseQueryResponse(response, {
        values: [{ name: 'owner', type: 'optional<address>' }]
      });

      return decoded && decoded[0] ? decoded[0].toString() : null;
      
    } catch (error) {
      console.error('Get proof owner error:', error);
      return null;
    }
  }

  // Get user proof count
  public async getUserProofCount(userAddress: string): Promise<number> {
    try {
      const query = this.contract.createQuery({
        func: new ContractFunction('getUserProofCount'),
        args: [new Address(userAddress)]
      });

      const response = await this.networkProvider.queryContract(query);
      
      if (!response.returnData || response.returnData.length === 0) {
        return 0;
      }

      const decoded = this.resultsParser.parseQueryResponse(response, {
        values: [{ name: 'count', type: 'u64' }]
      });

      return decoded && decoded[0] ? parseInt(decoded[0].toString()) : 0;
      
    } catch (error) {
      console.error('Get user proof count error:', error);
      return 0;
    }
  }

  // Get total proofs count
  public async getTotalProofs(): Promise<number> {
    try {
      const query = this.contract.createQuery({
        func: new ContractFunction('getTotalProofs'),
        args: []
      });

      const response = await this.networkProvider.queryContract(query);
      
      if (!response.returnData || response.returnData.length === 0) {
        return 0;
      }

      const decoded = this.resultsParser.parseQueryResponse(response, {
        values: [{ name: 'total', type: 'u64' }]
      });

      return decoded && decoded[0] ? parseInt(decoded[0].toString()) : 0;
      
    } catch (error) {
      console.error('Get total proofs error:', error);
      return 0;
    }
  }

  // Wait for transaction completion
  public async waitForTransaction(txHash: string, maxRetries: number = 10): Promise<any> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const status = await this.getTransactionStatus(txHash);
        
        if (status.status === 'executed' || status.status === 'success') {
          return status;
        }
        
        if (status.status === 'failed' || status.status === 'invalid') {
          throw new Error(`Transaction failed: ${status.status}`);
        }
        
        // Wait 2 seconds before next check
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        if (i === maxRetries - 1) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    throw new Error('Transaction timeout');
  }

  // Get transaction status
  private async getTransactionStatus(txHash: string): Promise<any> {
    return await this.networkProvider.getTransactionStatus(txHash);
  }
}

// Export singleton instance
export const contractService = ContractService.getInstance();
export default contractService;