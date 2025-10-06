declare module '@solana/web3.js' {
  export interface Signer {
    publicKey: PublicKey;
    secretKey?: Uint8Array;
  }

  export class Wallet {
    constructor();
    publicKey: PublicKey;
    signTransaction(tx: Transaction): Promise<Transaction>;
    signAllTransactions(txs: Transaction[]): Promise<Transaction[]>;
  }

  export class Transaction {
    constructor();
    add(...items: any[]): void;
    sign(...signers: Signer[]): Promise<void>;
    serialize(): Uint8Array;
  }

  export const LAMPORTS_PER_SOL: number;
}
