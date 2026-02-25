import crypto from "node:crypto";
import type { VercelRequest } from "@vercel/node";
import type { Role, User } from "@prisma/client";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { TOKEN_TTL } from "@reelforge/shared";
import { env } from "./env";
import { AppError } from "./errors";
import { prisma } from "./prisma";

const refreshTtlMs = 30 * 24 * 60 * 60 * 1000;

type AccessTokenPayload = JwtPayload & {
  type: "access";
  sub: string;
  email: string;
  role: "user" | "admin";
};

type RefreshTokenPayload = JwtPayload & {
  type: "refresh";
  sub: string;
  jti: string;
};

function roleToWire(role: Role): "user" | "admin" {
  return role === "ADMIN" ? "admin" : "user";
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function signAccessToken(user: Pick<User, "id" | "email" | "role">) {
  return jwt.sign(
    {
      type: "access",
      email: user.email,
      role: roleToWire(user.role),
    },
    env.JWT_SECRET,
    {
      subject: user.id,
      expiresIn: TOKEN_TTL.access,
    },
  );
}

function signRefreshToken(user: Pick<User, "id">, jti: string) {
  return jwt.sign(
    {
      type: "refresh",
      jti,
    },
    env.JWT_REFRESH_SECRET,
    {
      subject: user.id,
      expiresIn: TOKEN_TTL.refresh,
    },
  );
}

export async function issueAuthTokens(user: Pick<User, "id" | "email" | "role">) {
  const jti = crypto.randomUUID();
  const refreshToken = signRefreshToken(user, jti);

  await prisma.refreshToken.create({
    data: {
      id: jti,
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + refreshTtlMs),
    },
  });

  return {
    accessToken: signAccessToken(user),
    refreshToken,
  };
}

export function getBearerToken(req: VercelRequest) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;

  return token;
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;

    if (decoded.type !== "access" || !decoded.sub) {
      throw new AppError(401, "INVALID_ACCESS_TOKEN", "Invalid access token.");
    }

    return decoded;
  } catch {
    throw new AppError(401, "INVALID_ACCESS_TOKEN", "Access token is invalid or expired.");
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;

    if (decoded.type !== "refresh" || !decoded.sub || !decoded.jti) {
      throw new AppError(401, "INVALID_REFRESH_TOKEN", "Invalid refresh token.");
    }

    return decoded;
  } catch {
    throw new AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired.");
  }
}

export async function requireUserFromRequest(req: VercelRequest) {
  const token = getBearerToken(req);

  if (!token) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required.");
  }

  const payload = verifyAccessToken(token);
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "User account not found.");
  }

  return {
    ...user,
    role: roleToWire(user.role),
  };
}

export async function requireAdminFromRequest(req: VercelRequest) {
  const user = await requireUserFromRequest(req);

  if (user.role !== "admin") {
    throw new AppError(403, "FORBIDDEN", "Admin access is required.");
  }

  return user;
}

export async function rotateRefreshToken(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken);
  const tokenHash = hashToken(refreshToken);

  const existingToken = await prisma.refreshToken.findFirst({
    where: {
      id: payload.jti,
      userId: payload.sub,
      tokenHash,
      revokedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  if (!existingToken) {
    throw new AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired.");
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, role: true },
  });

  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "User account not found.");
  }

  await prisma.refreshToken.update({
    where: { id: existingToken.id },
    data: { revokedAt: new Date() },
  });

  return issueAuthTokens(user);
}

export async function revokeRefreshToken(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken);

  await prisma.refreshToken.updateMany({
    where: {
      id: payload.jti,
      userId: payload.sub,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}