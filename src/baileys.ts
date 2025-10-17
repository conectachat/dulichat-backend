import makeWASocket, { useMultiFileAuthState, DisconnectReason, WAMessage } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import { supa } from './supabase.js';

type Session = {
  id: string;
  state: 'DISCONNECTED'|'QR'|'CONNECTING'|'CONNECTED';
  qr?: string;
};

const logger = pino({ transport: { target: 'pino-pretty' } });

let sock: ReturnType<typeof makeWASocket> | null = null;
let currentQR: string | null = null;

export async function startSession(sessionLabel = 'Default') {
  const { state, saveCreds } = await useMultiFileAuthState(`./auth/${sessionLabel}`);
  sock = makeWASocket({
    printQRInTerminal: false, // nós vamos emitir o QR via evento
    auth: state,
    logger
  });

  sock.ev.on('connection.update', async (u) => {
    const { connection, lastDisconnect, qr } = u;
    if (qr) {
      currentQR = qr; // guarde o QR (string)
      // Opcional: salvar QR no Supabase para auditoria
      await supa.from('wa_sessions').update({ state: 'QR', qr_code: qr, updated_at: new Date().toISOString() })
        .eq('phone_label', sessionLabel);
    }
    if (connection === 'open') {
      currentQR = null;
      await supa.from('wa_sessions').update({ state: 'CONNECTED', qr_code: null, updated_at: new Date().toISOString() })
        .eq('phone_label', sessionLabel);
    } else if (connection === 'close') {
      const reason = new Boom((lastDisconnect?.error as any))?.output?.statusCode;
      if (reason !== DisconnectReason.loggedOut) {
        // tenta reconectar
        startSession(sessionLabel);
      }
    }
  });

  sock.ev.on('creds.update', async () => {
    await saveCreds();
  });

  sock.ev.on('messages.upsert', async (m) => {
    const msgs = m.messages as WAMessage[];
    for (const msg of msgs) {
      const text = msg.message?.conversation
        || msg.message?.extendedTextMessage?.text
        || msg.message?.imageMessage?.caption
        || '';
      const waMsgId = msg.key.id || '';
      const from = msg.key.remoteJid || '';
      const isGroup = from.endsWith('@g.us');
      // upsert chat
      const { data: chat } = await supa.from('wa_chats').select('id').eq('wa_id', from).maybeSingle();
      let chatId = chat?.id;
      if (!chatId) {
        const ins = await supa.from('wa_chats').insert({
          wa_id: from, is_group: isGroup
        }).select('id').single();
        chatId = ins.data?.id;
      }
      // save message
      await supa.from('wa_messages').insert({
        chat_id: chatId, direction: 'IN', sender_wa_id: msg.key.participant || from, wa_msg_id: waMsgId, body: text
      });
      // TODO: emitir via WebSocket aos clientes conectados
    }
  });

  // cria/atualiza sessão no Supabase
  await supa.from('wa_sessions')
    .upsert({ phone_label: sessionLabel, state: 'CONNECTING', updated_at: new Date().toISOString() }, { onConflict: 'phone_label' });
}

export function getCurrentQR() {
  return currentQR;
}

export async function sendMessage(jid: string, text: string) {
  if (!sock) throw new Error('Session not started');
  await sock.sendMessage(jid, { text });
}

