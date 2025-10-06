import { PublicKey } from '@solana/web3.js';

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

export const DOCUMENT_IDL = {
  version: "0.1.0",
  name: "document_program",
  metadata: {
    address: "11111111111111111111111111111111"
  },
  instructions: [
    {
      name: "createDocument",
      accounts: [
        {
          name: "document",
          isMut: true,
          isSigner: false
        },
        {
          name: "owner",
          isMut: true,
          isSigner: true
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false
        }
      ],
      args: [
        {
          name: "id",
          type: "string"
        },
        {
          name: "title",
          type: "string"
        },
        {
          name: "ipfsHash",
          type: "string"
        }
      ]
    },
    {
      name: "updateDocument",
      accounts: [
        {
          name: "document",
          isMut: true,
          isSigner: false
        },
        {
          name: "owner",
          isMut: true,
          isSigner: true
        }
      ],
      args: [
        {
          name: "ipfsHash",
          type: "string"
        }
      ]
    },
    {
      name: "deleteDocument",
      accounts: [
        {
          name: "document",
          isMut: true,
          isSigner: false
        },
        {
          name: "owner",
          isMut: true,
          isSigner: true
        }
      ],
      args: []
    }
  ],
  accounts: [
    {
      name: "Document",
      type: {
        kind: "struct",
        fields: [
          {
            name: "owner",
            type: "publicKey"
          },
          {
            name: "id",
            type: "string"
          },
          {
            name: "title",
            type: "string"
          },
          {
            name: "ipfsHash",
            type: "string"
          },
          {
            name: "createdAt",
            type: "i64"
          },
          {
            name: "updatedAt",
            type: "i64"
          }
        ]
      }
    }
  ]
} as const;
