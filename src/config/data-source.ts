import { DataSource } from "typeorm";
import { config } from "./index.js";
import { ENTITIES } from "./entities.js";

const dataSource = new DataSource({
  type: 'postgres',
  host: config.database.host,
  port: config.database.port,
  username: config.database.user,
  password: config.database.password,
  database: config.database.name,
  entities: ENTITIES,
  migrations: ['dist/migrations/*.js'],
  synchronize: false,
});

export default dataSource;
