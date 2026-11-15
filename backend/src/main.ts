import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // All routes start with /api, as in the project PDF
  app.setGlobalPrefix('api');

  // Reads the auth cookies (ACC-19)
  app.use(cookieParser());

  // The Next.js frontend must be allowed to send cookies (Milestone 2)
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3001',
    credentials: true,
  });

  app.useGlobalFilters(new AllExceptionsFilter());

  // Rejects invalid request bodies and strips unknown fields
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger UI
  const config = new DocumentBuilder()
    .setTitle('Travel Planning and Booking Platform API')
    .setDescription('Software Project I, Winter 2026')
    .setVersion('1.0')
    .addCookieAuth('access_token')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();