import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/db"
import { authOptions } from "@/lib/auth"

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userId, newBalance } = await request.json()

    // Verify the user is updating their own balance or is an admin/agent
    if (userId !== session.user.id && session.user.role !== 'ADMIN' && session.user.role !== 'AGENT') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Update user balance in database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { balance: newBalance }
    })

    return NextResponse.json({
      status: 'success',
      data: {
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          role: updatedUser.role,
          balance: updatedUser.balance
        }
      }
    })
  } catch (error) {
    console.error('Balance update error:', error)
    return NextResponse.json(
      { error: "Failed to update balance" },
      { status: 500 }
    )
  }
} 