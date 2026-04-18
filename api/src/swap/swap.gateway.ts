import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

interface JwtPayload {
  sub: number;
  email: string;
  role: string;
}

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/swap' })
export class SwapGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  handleConnection(client: Socket): void {
    try {
      const handshake = client.handshake as {
        auth?: { token?: string };
        headers?: { authorization?: string };
      };

      const token: string | undefined =
        handshake.auth?.token ??
        handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const secret = this.configService.get<string>('JWT_SECRET') ?? '';
      const payload = this.jwtService.verify<JwtPayload>(token, { secret });

      (client.data as { userId: number }).userId = payload.sub;
      void client.join(`user_${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleDisconnect(_client: Socket): void {
    // no-op — socket.io cleans up rooms automatically
  }

  emitToUser(
    userId: number,
    event: string,
    payload: Record<string, unknown>,
  ): void {
    this.server.to(`user_${userId}`).emit(event, payload);
  }
}
