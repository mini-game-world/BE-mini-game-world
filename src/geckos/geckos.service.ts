import { Injectable, OnModuleInit } from '@nestjs/common';
import geckos, { GeckosServer } from '@geckos.io/server';
import { Server } from 'http';
import { Inject } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import * as https from 'https';
import * as fs from 'fs';

@Injectable()
export class GeckosService implements OnModuleInit {
  private io: GeckosServer;

  constructor(@Inject(HttpAdapterHost) private readonly adapterHost: HttpAdapterHost) {}

  onModuleInit() {
    const server: Server = this.adapterHost.httpAdapter.getHttpServer();
    this.io = geckos();

    this.io.addServer(server);
    this.io.onConnection(channel => {
      console.log('A user connected:', channel.id);
      // Your connection handling code here
    });
  }
}