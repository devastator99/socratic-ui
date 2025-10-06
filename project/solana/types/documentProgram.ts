import { PublicKey } from '@solana/web3.js';
import { Program, Idl } from '@coral-xyz/anchor';

export interface DocumentAccount {
  owner: PublicKey;
  id: string;
  title: string;
  ipfsHash: string;
  createdAt: number;
  updatedAt: number;
}

export interface DocumentMetadata {
  title: string;
  ipfsHash: string;
}

export type DocumentInstructionAccounts = {
  document: PublicKey;
  owner: PublicKey;
  systemProgram?: PublicKey;
};

export interface RpcMethod {
  rpc(): Promise<string>;
}

export interface MethodsBuilder {
  accounts(accounts: DocumentInstructionAccounts): RpcMethod;
}

export interface DocumentProgramMethods {
  createDocument(documentId: string, title: string, ipfsHash: string): MethodsBuilder;
  updateDocument(ipfsHash: string): MethodsBuilder;
  deleteDocument(): MethodsBuilder;
}

export interface DocumentProgramAccounts {
  document: {
    fetch(address: PublicKey): Promise<DocumentAccount>;
    all(): Promise<Array<{ publicKey: PublicKey; account: DocumentAccount }>>;
  };
}

export type DocumentProgram = Program<Idl> & {
  methods: DocumentProgramMethods;
  account: DocumentProgramAccounts;
};
