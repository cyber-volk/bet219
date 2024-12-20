import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        balance: true,
        createdAt: true,
        _count: {
          select: {
            gameHistory: true,
            sentTransfers: true,
            receivedTransfers: true
          }
        }
      }
    })

    return NextResponse.json({
      status: "success",
      data: {
        users: users.map(user => ({
          id: user.id,
          username: user.username,
          role: user.role,
          balance: user.balance,
          createdAt: user.createdAt.toISOString(),
          totalGames: user._count.gameHistory,
          totalTransfers: user._count.sentTransfers + user._count.receivedTransfers
        }))
      }
    })
  } catch (error) {
    console.error('Users fetch error:', error)
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    )
  }
}
