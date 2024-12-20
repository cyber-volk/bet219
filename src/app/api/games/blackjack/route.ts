import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/db"
import { authOptions } from "@/lib/auth"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { action, bet, winAmount, finalBalance } = await req.json()

    // Record game and update balance in a transaction
    const result = await prisma.$transaction(async (prisma) => {
      // Get fresh user data
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          username: true,
          role: true,
          balance: true
        }
      })

      if (!user) {
        throw new Error("User not found")
      }

      // Validate balance
      if (action === 'deal' && user.balance < bet) {
        throw new Error("Insufficient balance")
      }

      // Record game history
      const gameHistory = await prisma.gameHistory.create({
        data: {
          userId: user.id,
          gameType: "blackjack",
          bet: bet || 0,
          outcome: winAmount > 0 ? 'win' : 'lose',
          winAmount: winAmount || 0
        }
      })

      // Update user balance
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { 
          balance: finalBalance 
        },
        select: {
          id: true,
          username: true,
          role: true,
          balance: true
        }
      })

      return { 
        gameHistory, 
        user: updatedUser,
        balance: updatedUser.balance,
        sessionUser: {
          ...session.user,
          balance: updatedUser.balance
        }
      }
    })

    return NextResponse.json({
      status: 'success',
      gameHistory: result.gameHistory,
      user: result.user,
      balance: result.balance,
      sessionUser: result.sessionUser,
      message: action === 'resolve' ? 'Game completed successfully' : 'Game started successfully'
    })
  } catch (error) {
    console.error('Game error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process game" },
      { status: 500 }
    )
  }
} 