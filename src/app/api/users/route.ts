import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'AGENT')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { username, password, initialBalance } = await request.json()

    // Validate input
    if (!username || !password || !initialBalance) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      )
    }

    // Start a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Check if creator has sufficient balance
      const creator = await tx.user.findUnique({
        where: { id: session.user.id }
      })

      if (!creator) {
        throw new Error('Creator not found')
      }

      if (creator.balance < initialBalance) {
        throw new Error('Insufficient balance')
      }

      // Create new user
      const passwordHash = await bcrypt.hash(password, 10)
      const newUser = await tx.user.create({
        data: {
          username,
          passwordHash,
          balance: initialBalance,
          role: 'USER',
          createdBy: session.user.id
        }
      })

      // Update creator's balance
      await tx.user.update({
        where: { id: session.user.id },
        data: { balance: creator.balance - initialBalance }
      })

      // Create transfer record
      await tx.transfer.create({
        data: {
          amount: initialBalance,
          fromUserId: session.user.id,
          toUserId: newUser.id,
          type: 'initial_balance',
          status: 'completed',
          note: 'Initial balance transfer'
        }
      })

      return { newUser, updatedCreatorBalance: creator.balance - initialBalance }
    })

    return NextResponse.json({
      status: 'success',
      data: {
        user: result.newUser,
        creatorBalance: result.updatedCreatorBalance
      }
    })
  } catch (error) {
    console.error('User creation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create user' },
      { status: 500 }
    )
  }
} 