import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import { DOCUMENT_PROGRAM_ID } from './constants';
import { idl } from './idl';
import { DocumentMetadata } from './types';

export class DocumentClient {
  public program: Program;
  private provider: AnchorProvider;

  constructor(connection: Connection, wallet: Wallet) {
    this.provider = new AnchorProvider(connection, wallet, {});
    this.program = new Program(idl, DOCUMENT_PROGRAM_ID, this.provider);
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
      const tx = await this.program.methods
        .createDocument(documentId, metadata.title, metadata.ipfsHash)
        .accounts({
          document: documentPda,
          owner: this.provider.wallet.publicKey,
          systemProgram: SystemProgram.programId
        })
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
      const tx = await this.program.methods
        .updateDocument(metadata.ipfsHash || '')
        .accounts({
          document: documentPda,
          owner: this.provider.wallet.publicKey
        })
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
      const tx = await this.program.methods
        .deleteDocument()
        .accounts({
          document: documentPda,
          owner: this.provider.wallet.publicKey
        })
        .rpc();

      return tx;
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  async getDocument(documentId: string) {
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
      const account = await this.program.account.document.fetch(documentPda);
      return account;
    } catch (error) {
      console.error('Error fetching document:', error);
      throw error;
    }
  }

  async getUserDocuments() {
    if (!this.program) {
      throw new Error('Program not initialized');
    }

    try {
      const documents = await this.program.account.document.all([
        {
          memcmp: {
            offset: 8, // After discriminator
            bytes: this.provider.wallet.publicKey.toBase58()
          }
        }
      ]);
      return documents;
    } catch (error) {
      console.error('Error fetching user documents:', error);
      throw error;
    }
  }
}
