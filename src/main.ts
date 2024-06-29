import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import * as http from 'http';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // HTTP 서버 인스턴스를 가져옵니다.
  const server = http.createServer(app.getHttpAdapter().getInstance());

  // Geckos.io 서버를 초기화하고 HTTP 서버에 추가합니다.
  const { default: geckos } = await import('@geckos.io/server');
  const io = geckos({
    cors: {
      allowAuthorization: true,
      origin: '*',
    },
  });

  io.addServer(server);

  // NestJS 앱 서버와 Geckos.io 서버가 같은 포트에서 실행되도록 설정합니다.
  await app.init(); // app.listen 호출을 제거하고, 대신 app.init()을 호출합니다.

  server.listen(5000, '0.0.0.0', () => {
    console.log('NestJS and Geckos.io server listening on port 5000');
  });
}

bootstrap();
