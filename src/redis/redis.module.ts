import { Global, Inject, Module, OnApplicationShutdown } from "@nestjs/common";
import { Redis } from "ioredis";
import { config } from "../config";
import { REDIS_CLIENT } from "./constants/redis.constant";

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () => new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
      }),
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) { }

  async onApplicationShutdown() {
    await this.redis.quit()
  }
}
