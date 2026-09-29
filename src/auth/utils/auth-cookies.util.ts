import type { CookieSerializeOptions } from '@fastify/cookie';
import type { FastifyReply } from 'fastify';
import { config } from '../../config/index.js';

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

const baseCookieOptions = (): CookieSerializeOptions => ({
  path: '/',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
});

export const accessTokenCookieOptions = (): CookieSerializeOptions => ({
  ...baseCookieOptions(),
  maxAge: config.jwt.accessTokenExpiresIn,
});

export const refreshTokenCookieOptions = (): CookieSerializeOptions => ({
  ...baseCookieOptions(),
  maxAge: config.jwt.refreshTokenExpiresIn,
});

export function setAuthCookies(
  reply: FastifyReply,
  tokens: { accessToken: string; refreshToken: string },
) {
  reply.setCookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, accessTokenCookieOptions());
  reply.setCookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, refreshTokenCookieOptions());
}

export function clearAuthCookies(reply: FastifyReply) {
  const options = baseCookieOptions();
  reply.clearCookie(ACCESS_TOKEN_COOKIE, options);
  reply.clearCookie(REFRESH_TOKEN_COOKIE, options);
}
