import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/db"
import { authOptions } from "@/lib/auth"
import { Prisma } from "@prisma/client"

interface SearchParams {
  username?: {
    contains: string;
    mode: 'insensitive';
  };
  AND?: {
    createdBy?: string;
    role?: { not: string };
    id?: { not: string };
  }[];
  id?: string;
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !['ADMIN', 'AGENT'].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(request.url)
    const urlParams = url.searchParams
    const term = urlParams.get('term')
    const isSourceSearch = urlParams.get('source') === 'true'

    if (!term) {
      return NextResponse.json({ users: [] })
    }

    // Build the where clause based on role and search type
    const whereClause: SearchParams = {
      username: {
        contains: term,
        mode: 'insensitive',
      },
    }

    if (session.user.role === 'AGENT') {
      if (isSourceSearch) {
        // For source search, agent can only search themselves
        whereClause.id = session.user.id
      } else {
        // For destination search, agent can only search their created users
        whereClause.AND = [
          { createdBy: session.user.id },
          { role: { not: 'ADMIN' } }
        ]
      }
    } else if (session.user.role === 'ADMIN') {
      // For admin, exclude other admins from search results
      whereClause.AND = [
        { role: { not: 'ADMIN' } },
        { id: { not: session.user.id } }
      ]
    }

    const users = await prisma.user.findMany({
      where: whereClause as Prisma.UserWhereInput,
      select: {
        id: true,
        username: true,
        role: true,
        balance: true,
      },
      take: 10,
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('User search error:', error)
    return NextResponse.json(
      { error: "Failed to search users" },
      { status: 500 }
    )
  }
} 