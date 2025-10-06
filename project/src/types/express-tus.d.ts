declare module 'express-tus' {
  import { RequestHandler } from 'express';
  
  export interface TusOptions {
    directory: string;
    maxSize?: number;
  }
  
  export function createTusMiddleware(options: TusOptions): RequestHandler;
}
