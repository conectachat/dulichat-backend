import { Router } from 'express';
import { getCurrentQR, sendMessage, startSession } from './baileys.js';

const router = Router();

// Autenticação simples por API_KEY (do .env)
router.use((req, res, next) => {
  const key = req.header('x-api-key');
  if (!key || key !== process.env.API_KEY) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
});

router.post('/session/start', async (req, res) => {
  const body = req.body as { label?: string } | undefined;
  await startSession(body?.label || 'Default');
  res.json({ ok: true });
});

router.get('/session/qr', (req, res) => {
  const qr = getCurrentQR();
  res.json({ qr });
});

router.post('/messages/send', async (req, res) => {
  const body = req.body as { jid?: string; text?: string } | undefined;
  if (!body?.jid || !body?.text) {
    return res.status(400).json({ error: 'jid and text required' });
  }
  await sendMessage(body.jid, body.text);
  res.json({ ok: true });
});

export default router;
