import { Role } from '@prisma/client'

export type UserRole = Role;

export interface UserData {
  id: string | number;
  username: string;
  role: UserRole;
  balance: number;
}

export interface Transaction {
  type: string;
  fromUser: string;
  toUser: string;
  amount: number;
  date: Date;
  note: string;
  referenceId: string;
}

type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'
type BlackjackValue = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'
export type NoufiValue = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10'

export interface BlackjackCard {
  suit: Suit
  value: BlackjackValue
}

export interface NoufiCard {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades'
  value: NoufiValue
}

export type BlackjackHand = BlackjackCard[]
export type NoufiHand = NoufiCard[]

export interface BlackjackPlayer {
  hands: BlackjackHand[]
  bets: number[]
  currentHandIndex: number
  status: ('betting' | 'playing' | 'standing' | 'bust' | 'done' | 'blackjack' | 'win' | 'lose' | 'push')[]
  selectedChip: number
  previousBet: number
  splitCount: number[]
}

export interface NoufiPlayer {
  hand: NoufiHand
  bet: number
  status: 'betting' | 'playing' | 'win' | 'lose'
  selectedChip: number
  previousBet: number
}

// Add to your existing types
export interface SlotSymbol {
  id: string;
  name: string;
  multiplier: number;
}

// Add these interfaces to your existing types
export interface GameHistoryItem {
  id: string;
  userId: string;
  username: string;
  userRole: string;
  gameType: string;
  bet: number;
  outcome: string;
  winAmount: number | null;
  createdAt: string;
}

export interface TestUser {
  id: string;
  username: string;
  role: string;
  balance: number;
  createdAt: string;
  totalGames: number;
  totalTransfers: number;
}

export interface TestTransfer {
  id: string;
  amount: number;
  type: string;
  status: string;
  createdAt: string;
  fromUser: {
    username: string;
    role: string;
  };
  toUser: {
    username: string;
    role: string;
  };
}

export interface TestResponse {
  status: string;
  message?: string;
  data?: {
    users: TestUser[];
    transfers: TestTransfer[];
    gameHistory?: GameHistoryItem[];
  };
  error?: string;
}
