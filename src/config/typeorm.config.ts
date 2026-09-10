import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { config } from ".";

export const typeormConfig = (
  entities: any[],
  overrides: Partial<TypeOrmModuleOptions> = {},
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: config.database.host,
  port: config.database.port,
  username: config.database.user,
  password: config.database.password,
  database: config.database.name,
  entities,
  synchronize: true,
  ...overrides,
} as TypeOrmModuleOptions);