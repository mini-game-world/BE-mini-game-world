import { Module } from '@nestjs/common';
import { GuestController } from './guest.controller.js';

@Module({
  controllers: [GuestController],
})
export class GuestModule {}
