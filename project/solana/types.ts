import { PublicKey } from '@solana/web3.js';

export interface DocumentMetadata {
  title: string;
  description: string;
  fileType: string;
  ipfsHash: string;
  createdAt: number;
  updatedAt: number;
}

export interface DocumentAccount {
  owner: PublicKey;
  metadata: DocumentMetadata;
  isEncrypted: boolean;
  accessList: PublicKey[];
}

export interface UserAccount {
  documents: PublicKey[];
  createdAt: number;
  updatedAt: number;
}

export type DocumentProgramEvents = {
  DocumentCreated: {
    documentId: PublicKey;
    owner: PublicKey;
    metadata: DocumentMetadata;
  };
  DocumentUpdated: {
    documentId: PublicKey;
    metadata: DocumentMetadata;
  };
  DocumentAccessGranted: {
    documentId: PublicKey;
    grantedTo: PublicKey;
  };
  DocumentAccessRevoked: {
    documentId: PublicKey;
    revokedFrom: PublicKey;
  };
};
