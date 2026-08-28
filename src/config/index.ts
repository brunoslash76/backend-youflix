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
  },
  cookie: {
    secret: string | undefined
  },
} 

const checkEnvVarAvailability = (varName: string | undefined) => {
  if (!varName) throw new InternalServerErrorException(`${varName} environment variable is not set`);
  return varName;
}

export const config: CONFIG = {
  database: {
    url: checkEnvVarAvailability(process.env.DATABASE_URL as string),
    user: checkEnvVarAvailability(process.env.POSTGRES_USER as string),
    password: checkEnvVarAvailability(process.env.POSTGRES_PASSWORD as string),
    port: +checkEnvVarAvailability(process.env.POSTGRES_PORT as string),
    host: checkEnvVarAvailability(process.env.POSTGRES_HOST as string),
    name: checkEnvVarAvailability(process.env.POSTGRES_DB as string),
  },
  jwt: {
    secret: checkEnvVarAvailability(process.env.JWT_SECRET as string),
  },
  cookie: {
    secret: checkEnvVarAvailability(process.env.COOKIE_SECRET as string),
  },
}

