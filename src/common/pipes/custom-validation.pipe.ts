// src/pipes/custom-validation.pipe.ts
import { ValidationPipe, ArgumentMetadata, BadRequestException } from '@nestjs/common';

export class CustomValidationPipe extends ValidationPipe {
  public async transform(value: any, metadata: ArgumentMetadata) {
    try {
      return await super.transform(value, metadata);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new BadRequestException('요청형식이 맞지 않습니다.');
      }
      throw error;
    }
  }
}