import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const transfers = await prisma.transfer.findMany({
      take: 20,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        fromUser: {
          select: {
            username: true,
            role: true
          }
        },
        toUser: {
          select: {
            username: true,
            role: true
          }
        }
      }
    })

    const formattedTransfers = transfers.map(transfer => ({
      id: transfer.id,
      amount: transfer.amount,
      type: transfer.type,
      status: transfer.status,
      createdAt: transfer.createdAt.toISOString(),
      fromUser: transfer.fromUser || { username: 'Unknown', role: 'UNKNOWN' },
      toUser: transfer.toUser || { username: 'Unknown', role: 'UNKNOWN' }
    }))

    return NextResponse.json({
      status: "success",
      data: {
        transfers: formattedTransfers
      }
    })
  } catch (error) {
    console.error('Transactions fetch error:', error)
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    )
  }
}
