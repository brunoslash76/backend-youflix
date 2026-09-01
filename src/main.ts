import fastifyCookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { config } from './config';
import { AppModule, ObserveInstrument } from './app.module.js';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard.js';

const COOKIE_SECRET = config.cookie.secret;
const PORT = Number(process.env.PORT ?? 3000);

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    instrument: ObserveInstrument,
  });

  await app.register(fastifyCookie, {
    secret: COOKIE_SECRET,
  })

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: [`'self'`],
        styleSrc: [`'self'`, `'unsafe-inline'`],
        imgSrc: [`'self'`, `'data:'`, `validator.swagger.io`],
        scriptSrc: [`'self'`, `'https:'`, `'unsafe-inline'`]
      }
    }
  })

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))

  const reflector = app.get(Reflector)
  app.useGlobalGuards(new JwtAuthGuard(reflector))

  const swaggerConfig = new DocumentBuilder()
    .setTitle('YouFlix API')
    .setDescription('API for YouFlix')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig)
  SwaggerModule.setup('api', app, document)

  await app.listen(PORT, '0.0.0.0');
  console.log(`Server is running on port ${PORT}`);
}
void bootstrap().catch((error) => {
  console.error('Failed to start server: ', error);
  process.exit(1);
});
