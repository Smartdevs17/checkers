import { RpcProvider, hash } from 'starknet';
import manifest from '../dojo/manifest.json';

const ACTIONS_ADDRESS = (manifest as any).contracts[0].address as string;
const NODE_URL = import.meta.env.VITE_PUBLIC_NODE_URL || '';

let _client: any = null;

export function setContractClient(client: any) {
  _client = client;
}

/** Fire-and-forget contract call — game engine doesn't block on chain. */
export function contractCall(method: string, ...args: any[]) {
  const account = window.Wallet?.Account;
  if (!account || !_client) {
    console.warn(`[contract] ${method} skipped: missing`, !account ? "account" : "client");
    return;
  }
  console.log(`[contract] ${method}(${args.join(", ")})`);
  (_client.actions as any)[method](account, ...args).catch((err: any) =>
    console.warn(`[contract] ${method} failed:`, err),
  );
}

/** Async contract call — awaits tx confirmation. Returns tx or null. */
export async function contractCallAsync(method: string, ...args: any[]): Promise<any> {
  const account = window.Wallet?.Account;
  if (!account || !_client) return null;
  try {
    const tx = await (_client.actions as any)[method](account, ...args);
    await account.waitForTransaction(tx.transaction_hash);
    return tx;
  } catch (err: any) {
    console.warn(`[contract] ${method} failed:`, err);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Game-scoped contract calls — auto-queues while onChainGameId is   */
/*  pending, then flushes when ID arrives.                            */
/* ------------------------------------------------------------------ */
let _chainGameId: number | null = null;
let _pendingCalls: Array<{ method: string; args: any[] }> = [];

/** Set the on-chain game ID. Flushes any queued calls. */
export function setChainGameId(id: number | null) {
  _chainGameId = id;
  if (id && _pendingCalls.length > 0) {
    const calls = [..._pendingCalls];
    _pendingCalls = [];
    for (const call of calls) {
      console.log(`[contract] Flushing queued ${call.method}(${id}, ${call.args.join(", ")})`);
      contractCall(call.method, id, ...call.args);
    }
  }
  if (!id) {
    _pendingCalls = [];
  }
}

/**
 * Fire a contract call scoped to the current on-chain game.
 * If the game ID isn't available yet, the call is queued and
 * will fire automatically once setChainGameId is called.
 */
export function gameContractCall(method: string, ...args: any[]) {
  if (_chainGameId) {
    contractCall(method, _chainGameId, ...args);
  } else {
    console.log(`[contract] Queuing ${method}(${args.join(", ")}) — waiting for on-chain game ID`);
    _pendingCalls.push({ method, args });
  }
}

/** Create game on-chain and return the game_id read from contract storage. */
export async function createGameOnChain(mode: number): Promise<number | null> {
  const account = window.Wallet?.Account;
  if (!account || !_client) {
    console.warn("[contract] createGameOnChain: missing", !account ? "account" : "client");
    return null;
  }
  try {
    const tx = await _client.actions.createGame(account, mode);
    console.log("[contract] createGame tx submitted:", tx.transaction_hash);
    await account.waitForTransaction(tx.transaction_hash);

    // Read game_count from the contract's storage — this equals the new game_id
    const rpc = new RpcProvider({ nodeUrl: NODE_URL });
    const key = hash.getSelectorFromName('game_count');
    const result = await rpc.getStorageAt(ACTIONS_ADDRESS, key);
    const gameId = Number(BigInt(result));

    if (gameId > 0) {
      console.log("[contract] Game created on-chain, id:", gameId);
      return gameId;
    }

    console.warn("[contract] game_count returned 0 after createGame");
    return null;
  } catch (err) {
    console.warn("[contract] createGame failed:", err);
    return null;
  }
}
