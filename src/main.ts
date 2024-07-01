import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as fs from 'fs';

async function bootstrap() {
  const httpsOptions = {
    key: fs.readFileSync('/etc/letsencrypt/live/jungleptest.xyz/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/jungleptest.xyz/fullchain.pem'),
  };

  const app = await NestFactory.create(AppModule, { httpsOptions });
  await app.listen(3000);

  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
