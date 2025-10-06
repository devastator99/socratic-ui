import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, Idl } from '@coral-xyz/anchor';
import * as anchor from '@coral-xyz/anchor';
import { 
  DOCUMENT_PROGRAM_ID,
  DOCUMENT_SEED_PREFIX,
  USER_SEED_PREFIX,
  SOLANA_NETWORK,
  SOLANA_RPC_ENDPOINT,
} from './constants';
import { DocumentMetadata, DocumentAccount, UserAccount } from './types';
import { DocumentProgram } from './types/document_program';
import { DocumentProgram } from './types/document_program';

export class DocumentClient {
  private connection: Connection;
  private provider: AnchorProvider;
  private program: Program;

  constructor(connection: Connection, wallet: anchor.Wallet) {
    this.connection = connection;
    this.provider = new AnchorProvider(connection, wallet, {
      commitment: 'processed'
    });
    anchor.setProvider(this.provider);
    const idl = require('./idl/document_program.json');
    this.program = new Program(
      idl,
      DOCUMENT_PROGRAM_ID.toString(),
      this.provider
    );
  }

  async createDocument(params: {
    documentId: string;
    name: string;
    ipfsHash: string;
  }) {
    const documentKey = PublicKey.findProgramAddressSync(
      [
        Buffer.from('document'),
        Buffer.from(params.documentId),
        this.provider.wallet.publicKey.toBuffer(),
      ],
      this.program.programId
    )[0];

    return await this.program.methods
      .createDocument(params.documentId, params.name, params.ipfsHash)
      .accounts({
        document: documentKey,
        owner: this.provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  async updateDocument(params: {
    documentId: string;
    ipfsHash: string;
  }) {
    const documentKey = PublicKey.findProgramAddressSync(
      [
        Buffer.from('document'),
        Buffer.from(params.documentId),
        this.provider.wallet.publicKey.toBuffer(),
      ],
      this.program.programId
    )[0];

    return await this.program.methods
      .updateDocument(params.ipfsHash)
      .accounts({
        document: documentKey,
        owner: this.provider.wallet.publicKey,
      })
      .rpc();
  }

  async deleteDocument(documentId: string) {
    const documentKey = PublicKey.findProgramAddressSync(
      [
        Buffer.from('document'),
        Buffer.from(documentId),
        this.provider.wallet.publicKey.toBuffer(),
      ],
      this.program.programId
    )[0];

    return await this.program.methods
      .deleteDocument()
      .accounts({
        document: documentKey,
        owner: this.provider.wallet.publicKey,
      })
      .rpc();
  }

  async getDocument(documentId: string) {
    const documentKey = PublicKey.findProgramAddressSync(
      [
        Buffer.from('document'),
        Buffer.from(documentId),
        this.provider.wallet.publicKey.toBuffer(),
      ],
      this.program.programId
    )[0];

    return await this.program.account.document.fetch(documentKey) as unknown as DocumentAccount;
  }

  async getUserDocuments() {
    return await this.program.account.document.all([
      {
        memcmp: {
          offset: 8, // Discriminator size
          bytes: this.provider.wallet.publicKey.toBase58(),
        },
      },
    ]);
  }
}
