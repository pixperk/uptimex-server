declare module 'jsonwebtoken' {
    export interface JwtPayload {
      [key: string]: any;
    }
  
    export function sign(
      payload: string | object | Buffer,
      secretOrPrivateKey: string,
      options?: SignOptions
    ): string;
  
    export function verify(
      token: string,
      secretOrPublicKey: string | Buffer,
      options?: VerifyOptions
    ): string | JwtPayload;
  
    export function decode(
      token: string,
      options?: DecodeOptions
    ): null | string | JwtPayload;
  
    export interface SignOptions {
      expiresIn?: string | number;
      notBefore?: string | number;
      audience?: string | string[];
      issuer?: string;
      jwtid?: string;
      subject?: string;
      noTimestamp?: boolean;
      header?: object;
      encoding?: string;
    }
  
    export interface VerifyOptions {
      algorithms?: string[];
      audience?: string | string[];
      clockTolerance?: number;
      issuer?: string | string[];
      ignoreExpiration?: boolean;
      ignoreNotBefore?: boolean;
      subject?: string;
      clockTimestamp?: number;
      maxAge?: string | number;
    }
  
    export interface DecodeOptions {
      json?: boolean;
      complete?: boolean;
    }
  }
  