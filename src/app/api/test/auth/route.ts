import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    console.log('Testing auth for username:', username);

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        passwordHash: true,
        role: true,
        balance: true,
      },
    });

    console.log('User found:', user ? 'yes' : 'no');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    console.log('Password valid:', isValid ? 'yes' : 'no');

    return NextResponse.json({
      status: 'success',
      valid: isValid,
      user: isValid ? {
        id: user.id,
        username: user.username,
        role: user.role,
        balance: user.balance,
      } : null,
    });
  } catch (error) {
    console.error('Auth test error:', error);
    return NextResponse.json({ error: 'Auth test failed' }, { status: 500 });
  }
} 