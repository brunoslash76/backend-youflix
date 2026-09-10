import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ObserveInstrument } from "./observe";
import { WorkerModule } from "./worker.module";

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(
    WorkerModule,
    {
      instrument: ObserveInstrument,
    }
  );
  app.enableShutdownHooks();

  new Logger('Worker').log('Video worker started - consuming "video-queue"')
}

void bootstrap().catch((error) => {
  console.error(error)
  process.exit(1)
})
