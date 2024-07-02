import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as process from "process";
import { CustomValidationPipe } from './common/pipes/custom-validation.pipe'
import * as fs from 'fs';
import * as http3 from 'http3';
import { StatusGateway } from './status/status.gateway';

async function bootstrap() {
  const httpsOptions = {
    key: fs.readFileSync(process.env.HTTPS_KEY),
    cert: fs.readFileSync(process.env.HTTPS_CERT),
  };

  const app = await NestFactory.create(AppModule, { httpsOptions });
  await app.init();

  const server = http3.createServer({
    key: httpsOptions.key,
    cert: httpsOptions.cert,
    allowHTTP1: true, // HTTP/1.1 지원을 위한 설정
  });

  const statusGateway = app.get(StatusGateway);

  server.on('session', (session) => {
    session.on('stream', (stream, headers) => {
      const path = headers[':path'];
      if (path === '/webtransport') {
        stream.respond({ ':status': 200, 'content-type': 'application/webtransport' });
        statusGateway.handleConnection(stream);
      }
    });
  });

  server.listen(process.env.PORT, () => {
    console.log(`Application is running on: ${process.env.PORT}`);
  });
}

bootstrap();
