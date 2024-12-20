import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const gameHistory = await prisma.gameHistory.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 20,
      include: {
        user: {
          select: {
            username: true,
            role: true
          }
        }
      }
    })

    return NextResponse.json({
      status: "success",
      data: {
        gameHistory: gameHistory.map(game => ({
          id: game.id,
          userId: game.userId,
          username: game.user.username,
          userRole: game.user.role,
          gameType: game.gameType,
          bet: game.bet,
          outcome: game.outcome,
          winAmount: game.winAmount,
          createdAt: game.createdAt.toISOString()
        }))
      }
    })
  } catch (error) {
    console.error('Game history fetch error:', error)
    return NextResponse.json(
      { error: "Failed to fetch game history" },
      { status: 500 }
    )
  }
}
