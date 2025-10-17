import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { WSEvent } from './types.js';

let wss: WebSocketServer | null = null;

export function initWS(server: Server, path = '/ws') {
  wss = new WebSocketServer({ server, path });
  wss.on('connection', (ws: WebSocket) => {
    // conexão aceita — não enviamos nada aqui por padrão.
  });
  return wss;
}

export function broadcast(evt: WSEvent) {
  if (!wss) return;
  const data = JSON.stringify(evt);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}
