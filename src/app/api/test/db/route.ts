import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    // Test database connection by counting users
    const _userCount = await prisma.user.count()
    
    // Get all users with their details
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        balance: true,
        createdAt: true,
      }
    })

    // Get recent transfers with user details
    const transfers = await prisma.transfer.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        amount: true,
        type: true,
        status: true,
        createdAt: true,
        fromUser: {
          select: {
            id: true,
            username: true,
            role: true
          }
        },
        toUser: {
          select: {
            id: true,
            username: true,
            role: true
          }
        }
      }
    })

    return NextResponse.json({
      status: "success",
      message: "Database connection successful",
      data: {
        users,
        transfers
      }
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { 
        status: "error",
        message: "Database connection failed",
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
} 