import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { config } from "./index.js";

export const typeormConfig = (entities: any[]): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: config.database.host,
  port: config.database.port,
  username: config.database.user,
  password: config.database.password,
  database: config.database.name,
  entities: entities,
  synchronize: true,
  });
