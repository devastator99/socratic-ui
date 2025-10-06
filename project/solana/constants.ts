import { PublicKey } from '@solana/web3.js';

export const TOKEN_PROGRAM_ID = new PublicKey("toke5DHWPvwZPZePxN6WzE6GzwGhBXkNxKRwFT8Dt9T");
export const INSIGHT_PROGRAM_ID = "insi8DHWPvwZPZePxN6WzE6GzwGhBXkNxKRwFT8Dt9T";
export const DOCUMENT_PROGRAM_ID = new PublicKey('YOUR_PROGRAM_ID_HERE'); // Replace with your deployed program ID

export const DOCUMENT_SEED_PREFIX = 'document';
export const USER_SEED_PREFIX = 'user';

// Network configuration
export const SOLANA_NETWORK = 'devnet'; // Change to 'mainnet-beta' for production
export const SOLANA_RPC_ENDPOINT = 'https://api.devnet.solana.com'; // Change for production

// Document constraints
export const MAX_DOCUMENT_SIZE = 32 * 1024 * 1024; // 32MB max file size
export const SUPPORTED_FILE_TYPES = ['pdf', 'doc', 'docx', 'txt'];

// IPFS configuration
export const IPFS_GATEWAY = 'https://ipfs.io/ipfs/';
