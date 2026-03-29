import { Pool } from "pg";

// Attach to globalThis so pools survive Next.js dev hot reloads
const globalPools = globalThis as unknown as {
  __pgPools?: Map<number, Pool>;
};

if (!globalPools.__pgPools) {
  globalPools.__pgPools = new Map<number, Pool>();
}

const pools = globalPools.__pgPools;

export function getPool(connId: number): Pool {
  const pool = pools.get(connId);
  if (!pool) throw new Error("Not connected. Please connect first.");
  return pool;
}

export function setPool(connId: number, pool: Pool) {
  pools.set(connId, pool);
}

export function removePool(connId: number) {
  const pool = pools.get(connId);
  if (pool) {
    pool.end();
    pools.delete(connId);
  }
}

export { pools };
