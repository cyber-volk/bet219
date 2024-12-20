"use client"

import { ReactNode, useState, useEffect } from 'react'
import { UserContext } from './user-context'
import { UserData } from '@/types'
import { toast } from 'react-toastify'
import { useSession } from 'next-auth/react'

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null)
  const [users, setUsers] = useState<UserData[]>([])
  const { data: session } = useSession()

  useEffect(() => {
    if (session?.user) {
      setUser({
        id: session.user.id,
        username: session.user.username,
        role: session.user.role,
        balance: session.user.balance
      })
    } else {
      setUser(null)
    }
  }, [session])

  const updateBalance = (newBalance: number) => {
    if (user) {
      setUser({ ...user, balance: newBalance })
      setUsers(users.map(u => u.id === user.id ? { ...u, balance: newBalance } : u))
    }
  }

  const canBet = (amount: number) => {
    return user !== null && user.balance >= amount
  }

  const transferFunds = (fromUserId: string, toUserId: string, amount: number) => {
    setUsers(prevUsers => prevUsers.map(user => {
      if (user.id.toString() === fromUserId) {
        return { ...user, balance: user.balance - amount }
      }
      if (user.id.toString() === toUserId) {
        return { ...user, balance: user.balance + amount }
      }
      return user
    }))
    if (user && user.id.toString() === fromUserId) {
      setUser({ ...user, balance: user.balance - amount })
    }
    toast.success(`Transfer of ${amount} TND completed`)
  }

  return (
    <UserContext.Provider value={{
      user,
      setUser,
      balance: user?.balance || 0,
      updateBalance,
      canBet,
      users,
      setUsers,
      transferFunds
    }}>
      {children}
    </UserContext.Provider>
  )
} 