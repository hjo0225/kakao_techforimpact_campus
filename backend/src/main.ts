import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // strip properties not on the DTO
      forbidNonWhitelisted: true, // 400 if extra properties are sent
      transform: true,            // coerce primitives + instantiate DTO classes
    }),
  );

  const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean)
    : ['http://localhost:5173'];
  app.enableCors({ origin: corsOrigin });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
