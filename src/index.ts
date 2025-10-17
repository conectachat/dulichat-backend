import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import routes from './routes.js';
import { initWS } from './ws.js';
import { startSession } from './baileys.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_, res) => res.json({ ok: true }));
app.use('/api', routes);

const server = http.createServer(app);
initWS(server, process.env.WS_PATH || '/ws');

const port = Number(process.env.PORT || 3001);
server.listen(port, async () => {
  console.log(`HTTP listening on ${port}`);
  // inicia sessão automaticamente (opcional)
  await startSession('Default');
});
