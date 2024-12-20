import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/db"
import { authOptions } from "@/lib/auth"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !['ADMIN', 'AGENT'].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { fromUserId, toUserId, amount } = await req.json()

    if (!fromUserId || !toUserId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid transfer parameters" },
        { status: 400 }
      )
    }

    // Start transaction
    const result = await prisma.$transaction(async (prisma) => {
      // Check sender's balance
      const sender = await prisma.user.findUnique({
        where: { id: fromUserId }
      })

      if (!sender) {
        throw new Error("Sender not found")
      }

      if (sender.balance < amount) {
        throw new Error("Insufficient balance")
      }

      // Check recipient exists
      const recipient = await prisma.user.findUnique({
        where: { id: toUserId }
      })

      if (!recipient) {
        throw new Error("Recipient not found")
      }

      // Verify permissions
      if (session.user.role === 'AGENT') {
        // Agents can only transfer from themselves and to their created users
        if (fromUserId !== session.user.id || recipient.createdBy !== session.user.id) {
          throw new Error("Unauthorized transfer")
        }
      }

      // Create transfer record
      const transfer = await prisma.transfer.create({
        data: {
          fromUserId,
          toUserId,
          amount,
          type: "transfer",
          status: "completed",
          note: `Transfer from ${sender.username} to ${recipient.username}`
        }
      })

      // Update balances
      const [updatedSender, updatedRecipient] = await Promise.all([
        prisma.user.update({
          where: { id: fromUserId },
          data: { balance: { decrement: amount } }
        }),
        prisma.user.update({
          where: { id: toUserId },
          data: { balance: { increment: amount } }
        })
      ])

      return {
        transfer,
        sender: {
          id: updatedSender.id,
          balance: updatedSender.balance
        },
        recipient: {
          id: updatedRecipient.id,
          balance: updatedRecipient.balance
        }
      }
    })

    return NextResponse.json({
      status: 'success',
      data: result
    })
  } catch (error) {
    console.error('Transfer error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
