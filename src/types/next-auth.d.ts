import 'next-auth';
import { Role } from '@prisma/client'

declare module 'next-auth' {
  interface User {
    id: string
    username: string
    role: Role
    balance: number
  }

  interface Session {
    user: {
      id: string
      username: string
      role: Role
      balance: number
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    username: string
    role: Role
    balance: number
  }
}
