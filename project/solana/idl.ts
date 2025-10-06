import { Idl } from '@coral-xyz/anchor';

export const idl: Idl = {
  version: '0.1.0',
  name: 'document_program',
  instructions: [
    {
      name: 'createDocument',
      accounts: [
        {
          name: 'document',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'owner',
          isMut: true,
          isSigner: true,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'id',
          type: 'string',
        },
        {
          name: 'title',
          type: 'string',
        },
        {
          name: 'ipfsHash',
          type: 'string',
        },
      ],
    },
    {
      name: 'updateDocument',
      accounts: [
        {
          name: 'document',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'owner',
          isMut: true,
          isSigner: true,
        },
      ],
      args: [
        {
          name: 'ipfsHash',
          type: 'string',
        },
      ],
    },
    {
      name: 'deleteDocument',
      accounts: [
        {
          name: 'document',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'owner',
          isMut: true,
          isSigner: true,
        },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: 'Document',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'owner',
            type: 'publicKey',
          },
          {
            name: 'id',
            type: 'string',
          },
          {
            name: 'title',
            type: 'string',
          },
          {
            name: 'ipfsHash',
            type: 'string',
          },
          {
            name: 'createdAt',
            type: 'i64',
          },
          {
            name: 'updatedAt',
            type: 'i64',
          },
        ],
      },
    },
  ],
  metadata: undefined,
  types: [],
  events: [],
  errors: [],
};
