import { NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(null)
    }

    // Get fresh user data
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (user) {
      session.user.balance = user.balance
    }

    return NextResponse.json(session)
  } catch (error) {
    console.error('Session fetch error:', error)
    return NextResponse.json(null)
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { balance } = await request.json()

    // Update user in database
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { balance }
    })

    // Return updated user data
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
    console.error('Session update error:', error)
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    )
  }
} 