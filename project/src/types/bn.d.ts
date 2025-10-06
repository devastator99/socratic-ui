declare module 'bn.js' {
  export class BN {
    constructor(n: number | string, base?: number);
    toArrayLike(bufferType: any, endian?: string, length?: number): Buffer;
    toString(base?: number, length?: number): string;
    toNumber(): number;
    toBuffer(endian?: string, length?: number): Buffer;
  }
}
