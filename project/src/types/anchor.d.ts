declare module '@coral-xyz/anchor' {
  export class BN {
    constructor(number: number | string);
    toString(): string;
    toNumber(): number;
  }

  export interface Idl {
    version: string;
    name: string;
    instructions: any[];
    accounts?: any[];
    types?: any[];
    events?: any[];
    errors?: any[];
    metadata?: any;
  }

  export const web3: {
    LAMPORTS_PER_SOL: number;
    PublicKey: {
      findProgramAddress(seeds: (Uint8Array | Buffer)[], programId: PublicKey): Promise<[PublicKey, number]>;
      findProgramAddressSync(seeds: (Uint8Array | Buffer)[], programId: PublicKey): [PublicKey, number];
    };
    SystemProgram: {
      programId: PublicKey;
    };
    Connection: {
      confirmTransaction(txSig: string): Promise<any>;
      requestAirdrop(to: PublicKey, amount: number): Promise<string>;
    };
    Keypair: {
      generate(): { publicKey: PublicKey; secretKey: Uint8Array };
    };
  };

  export class AnchorProvider {
    wallet: Wallet;
    connection: typeof anchor.web3.Connection;
    constructor(connection: Connection, wallet: Wallet, opts?: { commitment?: string, preflightCommitment?: string });
    static env(): AnchorProvider;
    static getProvider(): AnchorProvider;
  }

  export const workspace: {
    SocraticToken: Program<Idl>;
  };

  export function setProvider(provider: AnchorProvider): void;

  export interface Program<T extends Idl> {
    programId: PublicKey;
    rpc: {
      purchaseTokens(...args: any[]): Promise<any>;
      uploadDocument(...args: any[]): Promise<any>;
      chatQuery(...args: any[]): Promise<any>;
      shareDocument(...args: any[]): Promise<any>;
      initializeUser(...args: any[]): Promise<any>;
      generateQuiz(...args: any[]): Promise<any>;
      stakeTokens(...args: any[]): Promise<any>;
      unstakeTokens(...args: any[]): Promise<any>;
    };
    constructor(idl: Idl, programId: PublicKey | string, provider?: Provider): Program<T>;
    static at(programId: PublicKey | string, provider?: Provider): Promise<Program<Idl>>;
  }

  export interface Wallet {
    publicKey: PublicKey;
    signTransaction(tx: Transaction): Promise<Transaction>;
    signAllTransactions(txs: Transaction[]): Promise<Transaction[]>;
  }
}
