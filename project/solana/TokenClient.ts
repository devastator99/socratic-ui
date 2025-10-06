import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import * as anchor from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID } from './constants';
import { TokenProgram } from './types/tokenProgram';

export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
}

export class TokenClient {
  private connection: Connection;
  private provider: AnchorProvider;
  private program!: TokenProgram;
  private initialized: boolean = false;

  constructor(connection: Connection, wallet: anchor.Wallet) {
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
      const program = await Program.at(TOKEN_PROGRAM_ID, this.provider);
      if (!program) throw new Error('Program not found');

      this.program = program as TokenProgram;
      return true;
    } catch (error) {
      console.error('Failed to initialize program:', error);
      return false;
    }
  }

  async initializeToken(
    mint: PublicKey,
    metadata: TokenMetadata
  ): Promise<string> {
    if (!this.program) {
      throw new Error('Program not initialized');
    }

    const [tokenInfoPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('token_info'),
        mint.toBuffer()
      ],
      this.program.programId
    );

    try {
      const tx = await this.program.methods
        .initializeToken(
          metadata.name,
          metadata.symbol,
          metadata.decimals
        )
        .accounts({
          tokenInfo: tokenInfoPda,
          mint,
          authority: this.provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return tx;
    } catch (error) {
      console.error('Error initializing token:', error);
      throw error;
    }
  }

  async mintTokens(
    mint: PublicKey,
    tokenAccount: PublicKey,
    amount: number
  ): Promise<string> {
    if (!this.program) {
      throw new Error('Program not initialized');
    }

    const [tokenInfoPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('token_info'),
        mint.toBuffer()
      ],
      this.program.programId
    );

    try {
      const tx = await this.program.methods
        .mintTokens(new BN(amount))
        .accounts({
          tokenInfo: tokenInfoPda,
          mint,
          tokenAccount,
          mintAuthority: this.provider.wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          authority: this.provider.wallet.publicKey,
        })
        .rpc();

      return tx;
    } catch (error) {
      console.error('Error minting tokens:', error);
      throw error;
    }
  }

  async burnTokens(
    mint: PublicKey,
    tokenAccount: PublicKey,
    amount: number
  ): Promise<string> {
    if (!this.program) {
      throw new Error('Program not initialized');
    }

    try {
      const tx = await this.program.methods
        .burnTokens(new BN(amount))
        .accounts({
          mint,
          tokenAccount,
          owner: this.provider.wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      return tx;
    } catch (error) {
      console.error('Error burning tokens:', error);
      throw error;
    }
  }

  async transferTokens(
    from: PublicKey,
    to: PublicKey,
    amount: number
  ): Promise<string> {
    if (!this.program) {
      throw new Error('Program not initialized');
    }

    try {
      const tx = await this.program.methods
        .transferTokens(new BN(amount))
        .accounts({
          from,
          to,
          authority: this.provider.wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      return tx;
    } catch (error) {
      console.error('Error transferring tokens:', error);
      throw error;
    }
  }
}
