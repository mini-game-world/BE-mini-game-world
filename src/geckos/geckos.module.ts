import { Module } from '@nestjs/common';
import { GeckosIoService } from './geckos.service.js';

@Module({
  providers: [GeckosIoService],
  exports: [GeckosIoService],
})
export class GeckosIoModule {}