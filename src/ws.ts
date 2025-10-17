import { WebSocketServer } from 'ws';
import { getCurrentQR } from './baileys.js';

export function initWS(server, path='/ws') {
  const wss = new WebSocketServer({ server, path });
  wss.on('connection', (ws) => {
    // envia o QR atual assim que conectar, se existir
    const qr = getCurrentQR();
    if (qr) {
      ws.send(JSON.stringify({ type: 'qr', qr }));
    }
    // aqui você pode registrar o ws em uma lista para emitir eventos de novas mensagens
  });
  return wss;
}

