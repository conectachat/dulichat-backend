import { Router } from 'express';
import { getCurrentQR, sendMessage, startSession } from './baileys.js';

const router = Router();

// Autenticação simples por API_KEY
router.use((req, res, next) => {
  const key = req.header('x-api-key');
  if (!key || key !== process.env.API_KEY) return res.status(401).json({ error: 'unauthorized' });
  next();
});

router.post('/session/start', async (req, res) => {
  const { label } = req.body || {};
  await startSession(label || 'Default');
  res.json({ ok: true });
});

router.get('/session/qr', (req, res) => {
  const qr = getCurrentQR();
  res.json({ qr });
});

router.post('/messages/send', async (req, res) => {
  const { jid, text } = req.body;
  if (!jid || !text) return res.status(400).json({ error: 'jid and text required' });
  await sendMessage(jid, text);
  res.json({ ok: true });
});

export default router;

