import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import * as http from 'http';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const server = http.createServer(app.getHttpAdapter().getInstance());

  const { default: geckos } = await import('@geckos.io/server');
  const io = geckos({
    cors: {
      allowAuthorization: true,
      origin: '*',
    },
  });

  io.addServer(server);

  await app.listen(3000, '0.0.0.0', () => {
    console.log('NestJS server listening on port 3000');
  });

  server.listen(3002, () => {
    console.log('Geckos.io server listening on port 3001');
  });
}

bootstrap();
