import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol';
import { 
  AuthorizeAPI,
  DeauthorizeAPI,
  ReauthorizeAPI 
} from '@solana-mobile/mobile-wallet-adapter-protocol';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOLANA_RPC_URL = 'https://api.mainnet-beta.solana.com';

interface WalletContextType {
  publicKey: PublicKey | null;
  connected: boolean;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  connectionError: string | null;
  balance: number;
}

const WalletContext = createContext<WalletContextType>({
  publicKey: null,
  connected: false,
  connecting: false,
  connect: async () => {},
  disconnect: async () => {},
  connectionError: null,
  balance: 0,
});

export function useWallet() {
  return useContext(WalletContext);
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);

  const connection = useMemo(() => new Connection(SOLANA_RPC_URL), []);

  const connect = async () => {
    try {
      setConnecting(true);
      setConnectionError(null);

      const walletAccount = await transact(async (wallet: AuthorizeAPI & ReauthorizeAPI) => {
        const { accounts } = await wallet.authorize({
          cluster: 'mainnet-beta',
          identity: {
            name: 'Study App',
            uri: 'https://your-app-url.com',
            icon: 'https://your-app-url.com/icon.png',
          },
        });
        
        if (!accounts.length) {
          throw new Error('No accounts returned');
        }
        
        return accounts[0];
      });

      if (!walletAccount.address) {
        throw new Error('No wallet address returned');
      }

      const pubKey = new PublicKey(walletAccount.address);
      setPublicKey(pubKey);
      setConnected(true);

      // Save connection state
      await AsyncStorage.setItem('wallet_connected', 'true');
      await AsyncStorage.setItem('wallet_address', walletAccount.address);

      // Get balance
      const bal = await connection.getBalance(pubKey);
      setBalance(bal / 1e9); // Convert lamports to SOL

    } catch (err) {
      console.error('Wallet connection error:', err);
      setConnectionError(err instanceof Error ? err.message : 'Failed to connect wallet');
      await AsyncStorage.removeItem('wallet_connected');
      await AsyncStorage.removeItem('wallet_address');
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    try {
      await transact(async (wallet: DeauthorizeAPI) => {
        // Clear authorization
        setPublicKey(null);
        setConnected(false);
        setBalance(0);
      });

      // Clear stored connection state
      await AsyncStorage.removeItem('wallet_connected');
      await AsyncStorage.removeItem('wallet_address');

    } catch (err) {
      console.error('Wallet disconnection error:', err);
      setConnectionError(err instanceof Error ? err.message : 'Failed to disconnect wallet');
    }
  };

  // Auto-connect on app start if previously connected
  useEffect(() => {
    const autoConnect = async () => {
      try {
        const wasConnected = await AsyncStorage.getItem('wallet_connected');
        const storedAddress = await AsyncStorage.getItem('wallet_address');
        
        if (wasConnected === 'true' && storedAddress) {
          await connect();
        }
      } catch (error) {
        console.error('Auto-connect error:', error);
      }
    };
    autoConnect();
  }, []);

  // Update balance periodically when connected
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (connected && publicKey) {
      interval = setInterval(async () => {
        try {
          const bal = await connection.getBalance(publicKey);
          setBalance(bal / 1e9);
        } catch (err) {
          console.error('Balance update error:', err);
        }
      }, 30000); // Update every 30 seconds
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [connected, publicKey, connection]);

  const value = {
    publicKey,
    connected,
    connecting,
    connect,
    disconnect,
    connectionError,
    balance,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}
