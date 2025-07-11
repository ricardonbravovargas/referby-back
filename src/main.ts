import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // limpia propiedades no declaradas en DTO
      forbidNonWhitelisted: true, // lanza error si envían props no permitidas
      transform: true, // transforma payload a clases DTO
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
