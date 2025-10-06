import { Wallet } from '@solana/web3.js';

export interface AnchorWallet {
  signTransaction: Wallet['signTransaction'];
  signAllTransactions: Wallet['signAllTransactions'];
  publicKey: Wallet['publicKey'];
}
