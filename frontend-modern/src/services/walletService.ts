// MultiversX OnChain Proof - Wallet Service
import { 
  ExtensionProvider,
  WalletConnectV2Provider,
  WebWalletProvider,
  LedgerProvider,
  HWProvider
} from '@multiversx/sdk-web-wallet-provider';
import { ApiNetworkProvider } from '@multiversx/sdk-network-providers';
import { Account, Address, Transaction } from '@multiversx/sdk-core';
import { WalletProvider, WalletState } from '../types/proof';

export class WalletService {
  private static instance: WalletService;
  private currentProvider: any = null;
  private networkProvider: ApiNetworkProvider;
  private walletConnectV2RelayUrl = 'wss://relay.walletconnect.com';
  private walletConnectV2ProjectId = 'YOUR_WALLETCONNECT_PROJECT_ID'; // Replace with actual project ID
  
  private constructor(apiUrl: string) {
    this.networkProvider = new ApiNetworkProvider(apiUrl, {
      timeout: 5000
    });
  }

  public static getInstance(apiUrl: string = 'https://devnet-api.multiversx.com'): WalletService {
    if (!WalletService.instance) {
      WalletService.instance = new WalletService(apiUrl);
    }
    return WalletService.instance;
  }

  // Available wallet providers
  public getAvailableProviders(): WalletProvider[] {
    return [
      {
        id: 'extension',
        name: 'MultiversX DeFi Wallet',
        iconUrl: '/icons/multiversx-extension.svg',
        isInstalled: this.isExtensionInstalled()
      },
      {
        id: 'webwallet',
        name: 'Web Wallet',
        iconUrl: '/icons/web-wallet.svg',
        isInstalled: true // Always available
      },
      {
        id: 'walletconnect',
        name: 'xPortal Mobile',
        iconUrl: '/icons/xportal.svg',
        isInstalled: true // Always available
      },
      {
        id: 'ledger',
        name: 'Ledger Hardware',
        iconUrl: '/icons/ledger.svg',
        isInstalled: this.isLedgerSupported()
      }
    ];
  }

  private isExtensionInstalled(): boolean {
    return typeof window !== 'undefined' && 
           (window as any).elrondWallet !== undefined;
  }

  private isLedgerSupported(): boolean {
    return typeof navigator !== 'undefined' && 
           'usb' in navigator;
  }

  // Connect wallet based on provider ID
  public async connectWallet(providerId: string, callbackUrl?: string): Promise<WalletState> {
    try {
      let provider;
      
      switch (providerId) {
        case 'extension':
          if (!this.isExtensionInstalled()) {
            throw new Error('MultiversX Extension not installed');
          }
          provider = ExtensionProvider.getInstance();
          await provider.init();
          break;
          
        case 'webwallet':
          const webWalletUrl = callbackUrl || `${window.location.origin}/wallet-callback`;
          provider = new WebWalletProvider(webWalletUrl);
          break;
          
        case 'walletconnect':
          provider = new WalletConnectV2Provider({
            projectId: this.walletConnectV2ProjectId,
            relayUrl: this.walletConnectV2RelayUrl,
            metadata: {
              name: 'MVX OnChain Proof',
              description: 'Universal smart contract pentru badge/certificat/atestare pe blockchain MultiversX',
              url: window.location.origin,
              icons: [`${window.location.origin}/logo.png`]
            }
          });
          await provider.init();
          break;
          
        case 'ledger':
          if (!this.isLedgerSupported()) {
            throw new Error('Ledger not supported in this browser');
          }
          provider = new LedgerProvider();
          await provider.init();
          break;
          
        default:
          throw new Error(`Unknown provider: ${providerId}`);
      }

      this.currentProvider = provider;
      
      // Get account info
      const address = await provider.login();
      const account = new Account(new Address(address));
      await account.sync(this.networkProvider);
      
      const walletState: WalletState = {
        isConnected: true,
        address: address,
        balance: account.balance.toString(),
        provider: this.getAvailableProviders().find(p => p.id === providerId),
        isLoading: false
      };
      
      // Store connection state
      localStorage.setItem('wallet_state', JSON.stringify({
        providerId,
        address,
        connectedAt: Date.now()
      }));
      
      return walletState;
    } catch (error) {
      console.error('Wallet connection error:', error);
      return {
        isConnected: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  // Disconnect wallet
  public async disconnectWallet(): Promise<void> {
    try {
      if (this.currentProvider && this.currentProvider.logout) {
        await this.currentProvider.logout();
      }
    } catch (error) {
      console.error('Wallet disconnect error:', error);
    } finally {
      this.currentProvider = null;
      localStorage.removeItem('wallet_state');
    }
  }

  // Get current wallet state
  public getCurrentWalletState(): WalletState {
    const stored = localStorage.getItem('wallet_state');
    if (!stored) {
      return { isConnected: false, isLoading: false };
    }

    try {
      const { providerId, address } = JSON.parse(stored);
      return {
        isConnected: true,
        address,
        provider: this.getAvailableProviders().find(p => p.id === providerId),
        isLoading: false
      };
    } catch {
      localStorage.removeItem('wallet_state');
      return { isConnected: false, isLoading: false };
    }
  }

  // Sign and broadcast transaction
  public async signAndSendTransaction(transaction: Transaction): Promise<string> {
    if (!this.currentProvider) {
      throw new Error('No wallet connected');
    }

    try {
      // Sign transaction
      await this.currentProvider.signTransaction(transaction);
      
      // Broadcast transaction
      const txHash = await this.networkProvider.sendTransaction(transaction);
      
      return txHash;
    } catch (error) {
      console.error('Transaction error:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Transaction failed'
      );
    }
  }

  // Get transaction status
  public async getTransactionStatus(txHash: string): Promise<any> {
    try {
      return await this.networkProvider.getTransactionStatus(txHash);
    } catch (error) {
      console.error('Error getting transaction status:', error);
      throw error;
    }
  }

  // Get account balance
  public async getBalance(address: string): Promise<string> {
    try {
      const account = new Account(new Address(address));
      await account.sync(this.networkProvider);
      return account.balance.toString();
    } catch (error) {
      console.error('Error getting balance:', error);
      return '0';
    }
  }

  // Validate address format
  public isValidAddress(address: string): boolean {
    try {
      new Address(address);
      return true;
    } catch {
      return false;
    }
  }

  // Auto-reconnect on page load
  public async autoReconnect(): Promise<WalletState> {
    const stored = localStorage.getItem('wallet_state');
    if (!stored) {
      return { isConnected: false, isLoading: false };
    }

    try {
      const { providerId, connectedAt } = JSON.parse(stored);
      
      // Check if connection is recent (less than 24 hours)
      const isRecentConnection = Date.now() - connectedAt < 24 * 60 * 60 * 1000;
      
      if (isRecentConnection && providerId !== 'webwallet') {
        return await this.connectWallet(providerId);
      } else {
        localStorage.removeItem('wallet_state');
        return { isConnected: false, isLoading: false };
      }
    } catch (error) {
      console.error('Auto-reconnect failed:', error);
      localStorage.removeItem('wallet_state');
      return { 
        isConnected: false, 
        isLoading: false, 
        error: 'Auto-reconnect failed' 
      };
    }
  }

  // Get network provider instance
  public getNetworkProvider(): ApiNetworkProvider {
    return this.networkProvider;
  }

  // Get current provider instance
  public getCurrentProvider(): any {
    return this.currentProvider;
  }
}

// Export singleton instance
export const walletService = WalletService.getInstance();
export default walletService;