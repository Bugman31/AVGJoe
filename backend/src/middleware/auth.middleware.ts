import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../utils/prisma';

interface JwtPayload {
  sub: string;
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization header missing or malformed' });
    return;
  }

  const token = authHeader.slice(7);

  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, name: true },
  });

  if (!user) {
    res.status(401).json({ error: 'User not found' });
    return;
  }

  req.user = user;
  next();
}
