import { RpcProvider } from 'starknet';
import manifest from '../dojo/manifest.json';

const NODE_URL = import.meta.env.VITE_PUBLIC_NODE_URL || '';
const ACTIONS_ADDRESS = (manifest as any).contracts[0].address as string;

const provider = new RpcProvider({ nodeUrl: NODE_URL });

export interface PlayerData {
  address: string;
  username: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  gamesPlayed: number;
}

function feltToString(felt: string): string {
  try {
    let hex = felt.startsWith('0x') ? felt.slice(2) : felt;
    if (hex === '0' || hex === '') return '';
    if (hex.length % 2 !== 0) hex = '0' + hex;
    let result = '';
    for (let i = 0; i < hex.length; i += 2) {
      const charCode = parseInt(hex.substring(i, i + 2), 16);
      if (charCode === 0) continue;
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch {
    return '';
  }
}

function truncateAddress(addr: string): string {
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 6)}..${addr.slice(-4)}`;
}

export async function getPlayerCount(): Promise<number> {
  const result = await provider.callContract({
    contractAddress: ACTIONS_ADDRESS,
    entrypoint: 'get_player_count',
    calldata: [],
  });
  return Number(result[0]);
}

export async function getPlayerAddress(index: number): Promise<string> {
  const result = await provider.callContract({
    contractAddress: ACTIONS_ADDRESS,
    entrypoint: 'get_player_address',
    calldata: [index.toString()],
  });
  return result[0];
}

export async function getPlayer(address: string): Promise<PlayerData> {
  const result = await provider.callContract({
    contractAddress: ACTIONS_ADDRESS,
    entrypoint: 'get_player',
    calldata: [address],
  });
  // Returns: (username, rating, wins, losses, draws, games_played)
  return {
    address,
    username: feltToString(result[0]) || truncateAddress(address),
    rating: Number(result[1]),
    wins: Number(result[2]),
    losses: Number(result[3]),
    draws: Number(result[4]),
    gamesPlayed: Number(result[5]),
  };
}

export async function isPlayerRegistered(address: string): Promise<boolean> {
  const cacheKey = `checkers_registered_${address}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached === 'true') {
    getPlayer(address).then((p) => {
      if (p.username === '' || p.username === truncateAddress(address)) {
        localStorage.removeItem(cacheKey);
      }
    }).catch(() => {});
    return true;
  }
  try {
    const player = await getPlayer(address);
    const registered = player.gamesPlayed >= 0 && player.username !== '' && player.username !== truncateAddress(address);
    if (registered) localStorage.setItem(cacheKey, 'true');
    return registered;
  } catch {
    return false;
  }
}

export interface GameData {
  gameId: number;
  playerRed: string;
  playerBlack: string;
  currentTurn: number;
  status: number;
  result: number;
  resultReason: string;
  moveCount: number;
  capturedRed: number;
  capturedBlack: number;
  lastMoveFrom: number;
  lastMoveTo: number;
}

export async function getGame(gameId: number): Promise<GameData> {
  const result = await provider.callContract({
    contractAddress: ACTIONS_ADDRESS,
    entrypoint: 'get_game',
    calldata: [gameId.toString()],
  });
  // Returns: (player_red, player_black, current_turn, status, result, result_reason,
  //           move_count, captured_red, captured_black, last_move_from, last_move_to)
  return {
    gameId,
    playerRed: result[0],
    playerBlack: result[1],
    currentTurn: Number(result[2]),
    status: Number(result[3]),
    result: Number(result[4]),
    resultReason: feltToString(result[5]),
    moveCount: Number(result[6]),
    capturedRed: Number(result[7]),
    capturedBlack: Number(result[8]),
    lastMoveFrom: Number(result[9]),
    lastMoveTo: Number(result[10]),
  };
}

export async function getBoard(gameId: number): Promise<{ boardLow: bigint; boardHigh: bigint; board: number[] }> {
  const result = await provider.callContract({
    contractAddress: ACTIONS_ADDRESS,
    entrypoint: 'get_board',
    calldata: [gameId.toString()],
  });
  const boardLow = BigInt(result[0]);
  const boardHigh = BigInt(result[1]);
  return { boardLow, boardHigh, board: unpackBoard(boardLow, boardHigh) };
}

/** Convert packed u128 pair to 32-element board array (4 bits per square). */
function unpackBoard(low: bigint, high: bigint): number[] {
  const board: number[] = [];
  for (let i = 0; i < 16; i++) {
    board.push(Number((low >> BigInt(i * 4)) & 0xFn));
  }
  for (let i = 0; i < 16; i++) {
    board.push(Number((high >> BigInt(i * 4)) & 0xFn));
  }
  return board;
}

export async function getAllPlayers(): Promise<PlayerData[]> {
  const count = await getPlayerCount();
  if (count === 0) return [];

  const addresses = await Promise.all(
    Array.from({ length: count }, (_, i) => getPlayerAddress(i)),
  );

  const players = await Promise.all(
    addresses.filter((a) => a !== '0x0').map((addr) => getPlayer(addr)),
  );

  return players;
}
