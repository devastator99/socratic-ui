import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import * as anchor from '@coral-xyz/anchor';
import { INSIGHT_PROGRAM_ID } from './constants';
import { InsightProgram } from './types/insightProgram';
import { idl } from './idl';

export interface InsightMetadata {
  title: string;
  content: string;
  documentId: string;
  timestamp: number;
  ipfsHash: string;
}

export class InsightClient {
  private connection: Connection;
  private provider: AnchorProvider;
  private program!: InsightProgram;
  private initialized: boolean = false;

  constructor(connection: Connection, wallet: Wallet) {
    this.connection = connection;
    this.provider = new AnchorProvider(
      connection,
      wallet,
      { commitment: 'processed', preflightCommitment: 'processed' }
    );
    anchor.setProvider(this.provider);
  }

  dispose() {
    this.initialized = false;
    this.program = undefined as any;
  }

  async initialize() {
    try {
      this.program = new Program(idl, INSIGHT_PROGRAM_ID, this.provider) as unknown as InsightProgram;
      return true;
    } catch (error) {
      console.error('Failed to initialize program:', error);
      return false;
    }
  }

  async mintInsight(insightId: string, metadata: InsightMetadata): Promise<string> {
    if (!this.program) {
      throw new Error('Program not initialized');
    }

    const programId = this.program.programId;
    const [insightPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('insight'),
        Buffer.from(insightId),
        this.provider.wallet.publicKey.toBuffer()
      ],
      programId
    );

    try {
      const accounts = {
        insight: insightPda,
        owner: this.provider.wallet.publicKey,
        systemProgram: SystemProgram.programId
      };

      const tx = await this.program.methods
        .mintInsight(
          insightId,
          metadata.title,
          metadata.content,
          metadata.documentId,
          metadata.ipfsHash,
          new anchor.BN(metadata.timestamp)
        )
        .accounts(accounts)
        .rpc();

      return tx;
    } catch (error) {
      console.error('Error minting insight:', error);
      throw error;
    }
  }

  async getUserInsights() {
    if (!this.program) {
      throw new Error('Program not initialized');
    }

    try {
      const allInsights = await this.program.account.insight.all();
      const userInsights = allInsights.filter(
        ({ account }) => account.owner.equals(this.provider.wallet.publicKey)
      );
      return userInsights;
    } catch (error) {
      console.error('Error fetching user insights:', error);
      throw error;
    }
  }

  async getInsightByDocument(documentId: string) {
    if (!this.program) {
      throw new Error('Program not initialized');
    }

    try {
      const allInsights = await this.program.account.insight.all();
      const documentInsights = allInsights.filter(
        ({ account }) => account.documentId === documentId
      );
      return documentInsights;
    } catch (error) {
      console.error('Error fetching document insights:', error);
      throw error;
    }
  }
}
