"use client"

import { createContext } from 'react'
import { UserData } from '@/types'

interface UserContextType {
  user: UserData | null;
  setUser: React.Dispatch<React.SetStateAction<UserData | null>>;
  balance: number;
  updateBalance: (newBalance: number) => void;
  canBet: (amount: number) => boolean;
  users: UserData[];
  setUsers: React.Dispatch<React.SetStateAction<UserData[]>>;
  transferFunds: (fromUserId: string, toUserId: string, amount: number) => void;
}

export const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => {},
  balance: 0,
  updateBalance: () => {},
  canBet: () => false,
  users: [],
  setUsers: () => {},
  transferFunds: () => {},
}) 