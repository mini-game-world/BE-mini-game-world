import { Module } from '@nestjs/common';
import { GeckosService } from './geckos.service.js';

@Module({
  providers: [GeckosService],
})
export class GeckosModule {}