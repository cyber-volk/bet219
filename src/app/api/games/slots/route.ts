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

    const { bet, outcome, winAmount, finalBalance } = await req.json()

    // Record game and update balance in a transaction
    const result = await prisma.$transaction(async (prisma) => {
      // Get user with current balance
      const user = await prisma.user.findUnique({
        where: { id: session.user.id }
      })

      if (!user) {
        throw new Error("User not found")
      }

      // Record game history
      const gameHistory = await prisma.gameHistory.create({
        data: {
          userId: user.id,
          gameType: "slots",
          bet: bet || 0,
          outcome,
          winAmount: winAmount || 0
        }
      })

      // Update user balance
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { 
          balance: finalBalance 
        }
      })

      return { 
        gameHistory, 
        balance: updatedUser.balance,
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          role: updatedUser.role,
          balance: updatedUser.balance
        }
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Game error:', error)
    return NextResponse.json(
      { error: "Failed to process game" },
      { status: 500 }
    )
  }
}
