import { InternalServerErrorException } from "@nestjs/common"

export interface CONFIG  {
  database: {
    url: string | undefined
    user: string | undefined
    password: string | undefined
    port: number | undefined
    host: string | undefined
    name: string | undefined
  },
  jwt: {
    secret: string | undefined
    refreshTokenSecret: string | undefined
    accessTokenExpiresIn: number | undefined
    refreshTokenExpiresIn: number | undefined
  },
  cookie: {
    secret: string | undefined
  },
} 

const checkEnvVarAvailability = (name: string) => {
  const value = process.env[name];
  if (!value) throw new InternalServerErrorException(`${name} environment variable is not set`);
  return value;
}

export const config: CONFIG = {
  database: {
    url: process.env.DATABASE_URL ?? checkEnvVarAvailability('POSTGRES_URL'),
    user: checkEnvVarAvailability('POSTGRES_USER'),
    password: checkEnvVarAvailability('POSTGRES_PASSWORD'),
    port: +checkEnvVarAvailability('POSTGRES_PORT'),
    host: checkEnvVarAvailability('POSTGRES_HOST'),
    name: checkEnvVarAvailability('POSTGRES_DB'),
  },
  jwt: {
    secret: checkEnvVarAvailability('JWT_SECRET'),
    refreshTokenSecret: checkEnvVarAvailability('REFRESH_TOKEN_SECRET'),
    accessTokenExpiresIn: 15,
    refreshTokenExpiresIn: 7 * 24 * 60 * 60,
  },
  cookie: {
    secret: checkEnvVarAvailability('COOKIE_SECRET'),
  },
}

