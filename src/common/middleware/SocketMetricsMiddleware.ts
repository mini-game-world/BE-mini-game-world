import { Injectable, NestMiddleware } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter } from 'prom-client';

@Injectable()
export class SocketMetricsMiddleware implements NestMiddleware {
  constructor(
    @InjectMetric('websocket_connections_total')
    public counter: Counter<string>,
  ) {}

  use(req: any, res: any, next: () => void) {
    this.counter.inc();
    next();
  }
}
