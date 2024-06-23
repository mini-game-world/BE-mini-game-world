import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as process from "process";
import { CustomValidationPipe } from './common/pipes/custom-validation.pipe'

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  /**
   * whitelist  : DTO 에 정의되지 않는 속성 제거
   * forbidNonWhitelisted : DTO에 정의 되지 않는 속성이 존재할 시 예외 발생
   * transform : 입력데이터 객체로 변환.
   */
  app.useGlobalPipes(new CustomValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  await app.listen(process.env.PORT);

  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
