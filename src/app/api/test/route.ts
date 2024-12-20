import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    // Test database connection by counting users
    const userCount = await prisma.user.count()
    
    // Get all users (just for testing)
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        balance: true,
      }
    })

    return NextResponse.json({
      status: "success",
      message: "Database connection successful",
      userCount,
      users
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
