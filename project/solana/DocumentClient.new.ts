import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import type { Signer } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import * as anchor from '@coral-xyz/anchor';
import { DOCUMENT_PROGRAM_ID } from './constants';
import { DocumentMetadata } from './types';
import { DocumentProgram, DocumentInstructionAccounts } from './types/documentProgram';

export class DocumentClient {
  private connection: Connection;
  private provider: AnchorProvider;
  private program!: DocumentProgram;
  private initialized: boolean = false;

  constructor(connection: Connection, wallet: { publicKey: PublicKey; signTransaction: (tx: any) => Promise<any>; signAllTransactions: (txs: any[]) => Promise<any[]> }) {
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
      const program = await Program.at(DOCUMENT_PROGRAM_ID, this.provider);
      if (!program) throw new Error('Program not found');

      this.program = program as DocumentProgram;
      return true;
    } catch (error) {
      console.error('Failed to initialize program:', error);
      return false;
    }
  }

  async createDocument(documentId: string, metadata: DocumentMetadata): Promise<string> {
    if (!this.program) {
      throw new Error('Program not initialized');
    }

    const [documentPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('document'),
        Buffer.from(documentId),
        this.provider.wallet.publicKey.toBuffer()
      ],
      this.program.programId
    );

    try {
      const accounts: DocumentInstructionAccounts = {
        document: documentPda,
        owner: this.provider.wallet.publicKey,
        systemProgram: SystemProgram.programId
      };

      const tx = await this.program.methods
        .createDocument(documentId, metadata.title, metadata.ipfsHash)
        .accounts(accounts)
        .rpc();

      return tx;
    } catch (error) {
      console.error('Error creating document:', error);
      throw error;
    }
  }

  async updateDocument(documentId: string, metadata: Partial<DocumentMetadata>): Promise<string> {
    if (!this.program) {
      throw new Error('Program not initialized');
    }

    const [documentPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('document'),
        Buffer.from(documentId),
        this.provider.wallet.publicKey.toBuffer()
      ],
      this.program.programId
    );

    try {
      const accounts: DocumentInstructionAccounts = {
        document: documentPda,
        owner: this.provider.wallet.publicKey
      };

      const tx = await this.program.methods
        .updateDocument(metadata.ipfsHash || '')
        .accounts(accounts)
        .rpc();

      return tx;
    } catch (error) {
      console.error('Error updating document:', error);
      throw error;
    }
  }

  async deleteDocument(documentId: string): Promise<string> {
    if (!this.program) {
      throw new Error('Program not initialized');
    }

    const [documentPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('document'),
        Buffer.from(documentId),
        this.provider.wallet.publicKey.toBuffer()
      ],
      this.program.programId
    );

    try {
      const accounts: DocumentInstructionAccounts = {
        document: documentPda,
        owner: this.provider.wallet.publicKey
      };

      const tx = await this.program.methods
        .deleteDocument()
        .accounts(accounts)
        .rpc();

      return tx;
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  async getDocumentByAddress(documentPda: PublicKey) {
    if (!this.program) {
      throw new Error('Program not initialized');
    }

    try {
      const document = await this.program.account.document.fetch(documentPda);
      return document;
    } catch (error) {
      console.error('Error fetching document:', error);
      throw error;
    }
  }

  async getDocumentById(documentId: string) {
    if (!this.program) {
      throw new Error('Program not initialized');
    }

    const [documentPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('document'),
        Buffer.from(documentId),
        this.provider.wallet.publicKey.toBuffer()
      ],
      this.program.programId
    );

    try {
      const document = await this.program.account.document.fetch(documentPda);
      return document;
    } catch (error) {
      console.error('Error fetching document:', error);
      throw error;
    }
  }

  async getAllDocuments() {
    if (!this.program) {
      throw new Error('Program not initialized');
    }

    try {
      const documents = await this.program.account.document.all();
      return documents;
    } catch (error) {
      console.error('Error fetching all documents:', error);
      throw error;
    }
  }

  async getUserDocuments() {
    if (!this.program) {
      throw new Error('Program not initialized');
    }

    try {
      const allDocuments = await this.program.account.document.all();
      const userDocuments = allDocuments.filter(
        ({ account }: { account: { owner: PublicKey } }) => account.owner.equals(this.provider.wallet.publicKey)
      );
      return userDocuments;
    } catch (error) {
      console.error('Error fetching user documents:', error);
      throw error;
    }
  }
}
