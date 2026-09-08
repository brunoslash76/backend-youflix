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
  mailgun: {
    apiKey: string | undefined
    baseUrl: string | undefined
    domain: string | undefined
  },
  frontendUrl: string | undefined,
  redis: {
    host: string | undefined
    port: number | undefined
    password: string | undefined
  },
  aws: {
    s3: {
      region: string | undefined
      endpoint: string | undefined
      publicEndpoint: string | undefined
      accessKeyId: string | undefined
      secretAccessKey: string | undefined
      bucket: string | undefined
      cdnUrl: string | undefined
    }
  }
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
  mailgun: {
    apiKey: checkEnvVarAvailability('MAILGUN_API_KEY'),
    baseUrl: checkEnvVarAvailability('MAILGUN_BASE_URL'),
    domain: checkEnvVarAvailability('MAILGUN_DOMAIN'),
  },
  frontendUrl: checkEnvVarAvailability('FRONTEND_URL'),
  redis: {
    host: checkEnvVarAvailability('REDIS_HOST'),
    port: +checkEnvVarAvailability('REDIS_PORT'),
    password: checkEnvVarAvailability('REDIS_PASSWORD'),
  },
  aws: {
    s3: {
      region: checkEnvVarAvailability('AWS_S3_REGION'),
      endpoint: process.env.AWS_S3_ENDPOINT,
      publicEndpoint: process.env.AWS_S3_PUBLIC_ENDPOINT,
      accessKeyId: checkEnvVarAvailability('AWS_S3_ACCESS_KEY_ID'),
      secretAccessKey: checkEnvVarAvailability('AWS_S3_SECRET_ACCESS_KEY'),
      bucket: checkEnvVarAvailability('AWS_S3_BUCKET'),
      cdnUrl: process.env.AWS_S3_CDN_URL,
    }
  }
}
