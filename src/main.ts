import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as process from "process";
import { CustomValidationPipe } from './common/pipes/custom-validation.pipe'
import * as fs from 'fs';

async function bootstrap() {
  const httpsOptions = {
    key: fs.readFileSync(process.env.HTTPS_KEY),
    cert: fs.readFileSync(process.env.HTTPS_CERT),
  };

  const app = await NestFactory.create(AppModule, { httpsOptions });
  await app.listen(process.env.PORT);

  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
