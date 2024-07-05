import { Module } from '@nestjs/common';
import { GeckosIoModule } from '@src/geckos/geckos.module.js';
import { SocketMetricsGateway } from '@src/socket-metrics/socket-metrics.gateway.js';
import { makeCounterProvider, makeGaugeProvider, PrometheusModule } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [GeckosIoModule, PrometheusModule.register()],
  providers: [
    SocketMetricsGateway,
    makeCounterProvider({
      name: 'websocket_connections_total',
      help: '웹소켓 총 연결수 ',
    }),
    makeGaugeProvider({
      name: 'active_users',
      help: '현재 웹소켓 연결 수',
    }),
    makeCounterProvider({
      name: 'websocket_disconnections_total',
      help: '연결 해제 수 ',
    }),
  ],
})
export class SocketMetricsModule {}
