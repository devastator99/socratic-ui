import { Program, BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

export interface InsightAccount {
  owner: PublicKey;
  insightId: string;
  title: string;
  content: string;
  documentId: string;
  ipfsHash: string;
  timestamp: BN;
}

export interface InsightInstructionAccounts {
  insight: PublicKey;
  owner: PublicKey;
  systemProgram?: PublicKey;
}

export interface InsightProgram {
  account: {
    insight: {
      fetch(address: PublicKey): Promise<InsightAccount>;
      all(): Promise<Array<{ publicKey: PublicKey; account: InsightAccount }>>;
    };
  };
  methods: {
    mintInsight(
      insightId: string,
      title: string,
      content: string,
      documentId: string,
      ipfsHash: string,
      timestamp: BN
    ): {
      accounts(accounts: InsightInstructionAccounts): {
        rpc(): Promise<string>;
      };
    };
  };
}
