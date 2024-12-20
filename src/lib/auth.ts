import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { Role } from '@prisma/client'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { username: credentials.username }
        })

        if (!user) {
          return null
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!isValid) {
          return null
        }

        return {
          id: user.id,
          username: user.username,
          role: user.role,
          balance: user.balance,
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        token.username = user.username
        token.role = user.role
        token.balance = user.balance
      }

      // Only fetch fresh data if it's not a sign in
      if (trigger !== "signIn") {
        try {
          const freshUser = await prisma.user.findUnique({
            where: { id: token.id as string }
          })

          if (freshUser) {
            token.balance = freshUser.balance
          }
        } catch (error) {
          console.error('Error refreshing token:', error)
        }
      }

      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          id: token.id as string,
          username: token.username as string,
          role: token.role as Role,
          balance: token.balance as number,
        }
      }
      return session
    }
  },
  pages: {
    signIn: '/',
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
    updateAge: 60 * 60, // Update session every hour
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 // 24 hours
      }
    }
  },
  events: {
    async signIn({ user }) {
      try {
        await prisma.user.findUniqueOrThrow({
          where: { id: user.id }
        })
      } catch (err) {
        console.error('Sign in error:', err);
        throw new Error('User not found')
      }
    },
    async signOut() {
      // Clear any persisted session data
      if (typeof window !== 'undefined') {
        window.localStorage.clear();
        window.sessionStorage.clear();
      }
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
} 