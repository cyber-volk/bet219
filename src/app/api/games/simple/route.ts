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
      // Record game history
      const gameHistory = await prisma.gameHistory.create({
        data: {
          userId: session.user.id,
          gameType: "simple",
          bet,
          outcome,
          winAmount
        }
      })

      // Update user balance
      const updatedUser = await prisma.user.update({
        where: { id: session.user.id },
        data: { balance: finalBalance }
      })

      return { gameHistory, balance: updatedUser.balance }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 