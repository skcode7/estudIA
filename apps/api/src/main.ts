import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { AppModule } from "./app.module";

loadEnv({ path: resolve(__dirname, "..", ".env") });

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api/v1");
  app.enableCors({ origin: process.env.WEB_URL ?? "http://localhost:3000" });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));

  const config = new DocumentBuilder().setTitle("estudIA API").setVersion("v1").build();
  SwaggerModule.setup("api/docs", app, SwaggerModule.createDocument(app, config));

  await app.listen(Number(process.env.API_PORT ?? 3001));
}

void bootstrap();
