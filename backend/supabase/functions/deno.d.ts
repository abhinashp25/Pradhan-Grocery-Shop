// Ambient type declarations for the Deno runtime in Supabase Edge Functions.

declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    has(key: string): boolean;
    delete(key: string): void;
    toObject(): Record<string, string>;
  }

  export const env: Env;

  export interface ServeOptions {
    port?: number;
    hostname?: string;
    signal?: AbortSignal;
    onError?: (error: unknown) => Response | Promise<Response>;
    onListen?: (params: { hostname: string; port: number }) => void;
  }

  export function serve(
    handler: (req: Request) => Response | Promise<Response>,
    options?: ServeOptions,
  ): void;
}
