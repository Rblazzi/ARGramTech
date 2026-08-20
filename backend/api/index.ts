import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import express, { Request, Response } from 'express';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';

// Entrypoint serverless para a Vercel. Não chama app.listen() — a
// Vercel já cuida da camada HTTP; a gente só precisa inicializar o
// Nest uma vez por instância "quente" da função e reaproveitar em
// invocações seguintes (daí o cache em `bootstrapPromise`).
//
// Roda o mesmo bootstrap de src/main.ts (helmet, CORS, prefixo /api,
// validação global, filtro de exceções) — se um mudar, o outro também
// deveria mudar.
const server = express();
let bootstrapPromise: Promise<void> | null = null;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
  const config = app.get(ConfigService);

  app.use(helmet());
  app.enableCors({ origin: config.get<string>('CORS_ORIGIN'), credentials: true });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.init();
}

export default async function handler(req: Request, res: Response) {
  bootstrapPromise ??= bootstrap();
  try {
    await bootstrapPromise;
  } catch (err) {
    // Se o bootstrap falhar (ex.: env var faltando, banco fora do ar),
    // não deixa a instância "presa" repetindo o mesmo erro pra sempre —
    // libera pra tentar de novo na próxima invocação.
    bootstrapPromise = null;
    throw err;
  }
  server(req, res);
}
