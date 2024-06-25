import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import * as process from 'process';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT);

  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
