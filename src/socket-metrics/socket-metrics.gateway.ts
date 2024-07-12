import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Gauge } from 'prom-client';
import { GeckosIoService } from '../geckos/geckos.service.js';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

@WebSocketGateway()
export class SocketMetricsGateway implements OnGatewayConnection, OnGatewayInit {
  constructor(
    @InjectMetric('websocket_connections_total') private readonly connectionsTotal: Counter<string>,
    @InjectMetric('active_users') private readonly activeUsers: Gauge<string>,
    @InjectMetric('websocket_disconnections_total') private readonly disconnectionsTotal: Counter<string>,
    private readonly geckosIoService: GeckosIoService,
    private eventEmitter: EventEmitter2,
  ) {}

  async afterInit() {
    await this.geckosIoService.waitForInitialization();

    this.geckosIoService.io.onConnection((channel: any) => {
      this.handleConnection(channel);
    });

  }

  handleConnection(channel: any) {
    this.connectionsTotal.inc();
    this.activeUsers.inc();
  }

  handleDisconnect() {
    this.disconnectionsTotal.inc();
    this.activeUsers.dec();
  }

  @OnEvent('user.disconnected')
  disconnectedSignal(){
    this.handleDisconnect()
  }
}
