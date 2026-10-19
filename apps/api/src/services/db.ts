import type { Prisma } from "database";

export interface Transactor {
  $transaction<T>(
    run: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: { timeout?: number },
  ): Promise<T>;
}

/** A Prisma client: usable directly for reads and for opening transactions. */
export type Db = Transactor & Prisma.TransactionClient;

/** Time budget of the order and expiry transactions (Neon + serverless cold paths). */
export const TRANSACTION_TIMEOUT_MS = 10_000;
