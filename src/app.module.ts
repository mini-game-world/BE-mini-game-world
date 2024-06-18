import { Module } from '@nestjs/common';

import { StatusModule } from './status/status.module';

//test
@Module({
  imports: [StatusModule],
})
export class AppModule {}
