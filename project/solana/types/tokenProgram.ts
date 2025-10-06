import { Program, BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

export interface TokenInfo {
  mint: PublicKey;
  name: string;
  symbol: string;
  decimals: number;
  authority: PublicKey;
}

export interface TokenInstructionAccounts {
  tokenInfo: PublicKey;
  mint: PublicKey;
  authority: PublicKey;
  systemProgram?: PublicKey;
}

export type TokenIdl = {
  version: "0.1.0";
  name: "token_program";
  instructions: [
    {
      name: "initializeToken";
      discriminator: [0, 0, 0, 0, 0, 0, 0, 0];
      accounts: [
        { name: "tokenInfo"; isMut: true; isSigner: false },
        { name: "mint"; isMut: true; isSigner: false },
        { name: "authority"; isMut: true; isSigner: true },
        { name: "systemProgram"; isMut: false; isSigner: false }
      ];
      args: [
        { name: "name"; type: "string" },
        { name: "symbol"; type: "string" },
        { name: "decimals"; type: "u8" }
      ];
    },
    {
      name: "mintTokens";
      discriminator: [1, 0, 0, 0, 0, 0, 0, 0];
      accounts: [
        { name: "tokenInfo"; isMut: true; isSigner: false },
        { name: "mint"; isMut: true; isSigner: false },
        { name: "authority"; isMut: true; isSigner: true }
      ];
      args: [{ name: "amount"; type: "u64" }];
    },
    {
      name: "burnTokens";
      discriminator: [2, 0, 0, 0, 0, 0, 0, 0];
      accounts: [
        { name: "tokenInfo"; isMut: true; isSigner: false },
        { name: "mint"; isMut: true; isSigner: false },
        { name: "authority"; isMut: true; isSigner: true }
      ];
      args: [{ name: "amount"; type: "u64" }];
    },
    {
      name: "transferTokens";
      discriminator: [3, 0, 0, 0, 0, 0, 0, 0];
      accounts: [
        { name: "tokenInfo"; isMut: true; isSigner: false },
        { name: "mint"; isMut: true; isSigner: false },
        { name: "authority"; isMut: true; isSigner: true },
        { name: "recipient"; isMut: false; isSigner: false }
      ];
      args: [{ name: "amount"; type: "u64" }];
    }
  ];
  accounts: [
    {
      name: "tokenInfo";
      discriminator: [0, 0, 0, 0, 0, 0, 0, 0];
      type: {
        kind: "struct";
        fields: [
          { name: "mint"; type: "publicKey" },
          { name: "name"; type: "string" },
          { name: "symbol"; type: "string" },
          { name: "decimals"; type: "u8" },
          { name: "authority"; type: "publicKey" }
        ];
      };
    }
  ];
  metadata: {
    name: string;
    version: string;
    spec: string;
    address: string;
  };
};

export type TokenProgram = Program<TokenIdl & { address: string }>;
