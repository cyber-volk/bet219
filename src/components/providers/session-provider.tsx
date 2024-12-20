'use client'

import { Session } from "next-auth"
import { SessionProvider } from "next-auth/react"
import { PropsWithChildren } from 'react'

type AuthProviderProps = PropsWithChildren<{
  session: Session | null;
}>

export default function AuthProvider({ children, session }: AuthProviderProps) {
  return (
    <SessionProvider 
      session={session}
      refetchInterval={0}
      refetchOnWindowFocus={false}
    >
      {children}
    </SessionProvider>
  )
} 