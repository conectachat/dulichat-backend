import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  WAMessage
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import { supa } from './supabase.js';
import { broadcast } from './ws.js';
import type { SessionState, UINewMessageEvent } from './types.js';

const logger = pino({ transport: { target: 'pino-pretty' } });

let sock: ReturnType<typeof makeWASocket> | null = null;
let currentQR: string | null = null;

async function updateSessionState(state: SessionState, qr?: string | null, label = 'Default') {
  await supa
    .from('wa_sessions')
    .upsert(
      {
        phone_label: label,
        state,
        qr_code: qr ?? null,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'phone_label' }
    );
  broadcast({ type: 'session.state', payload: { state } });
}

export async function startSession(sessionLabel = 'Default') {
  const { state, saveCreds } = await useMultiFileAuthState(`./auth/${sessionLabel}`);

  sock = makeWASocket({
    printQRInTerminal: false,
    auth: state,
    logger
  });

  await updateSessionState('CONNECTING', null, sessionLabel);

  sock.ev.on('connection.update', async (u) => {
    const { connection, lastDisconnect, qr } = u;

    if (qr) {
      currentQR = qr;
      await updateSessionState('QR', qr, sessionLabel);
      // envia QR ao frontend
      broadcast({ type: 'qr', payload: { qr } });
    }

    if (connection === 'open') {
      currentQR = null;
      await updateSessionState('CONNECTED', null, sessionLabel);
    } else if (connection === 'close') {
      const reason = new Boom((lastDisconnect?.error as any))?.output?.statusCode;
      if (reason !== DisconnectReason.loggedOut) {
        // tenta reconectar
        startSession(sessionLabel).catch(() => {});
      } else {
        await updateSessionState('DISCONNECTED', null, sessionLabel);
      }
    }
  });

  sock.ev.on('creds.update', async () => {
    await saveCreds();
  });

  // Persistência e evento de novas mensagens
  sock.ev.on('messages.upsert', async (m) => {
    const msgs = m.messages as WAMessage[];
    for (const msg of msgs) {
      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        '';
      const waMsgId = msg.key.id || '';
      const from = msg.key.remoteJid || '';
      const isGroup = from.endsWith('@g.us');
      const participant = msg.key.participant || from;

      // Upsert chat
      const { data: chat } = await supa
        .from('wa_chats')
        .select('id')
        .eq('wa_id', from)
        .maybeSingle();

      let chatId = chat?.id as string | undefined;
      if (!chatId) {
        const ins = await supa
          .from('wa_chats')
          .insert({ wa_id: from, is_group: isGroup })
          .select('id')
          .single();
        chatId = ins.data?.id;
      }

      // Salva mensagem IN
      await supa.from('wa_messages').insert({
        chat_id: chatId,
        direction: 'IN',
        sender_wa_id: participant,
        wa_msg_id: waMsgId,
        body: text,
        timestamp: new Date().toISOString()
      });

      // Emite evento para o frontend
      const uiEvt: UINewMessageEvent = {
        chatJid: from,
        isGroup,
        waMsgId,
        from: participant,
        text,
        when: new Date().toISOString()
      };
      broadcast({ type: 'message.new', payload: uiEvt });
    }
  });

  // garante que exista um registro de sessão
  await supa.from('wa_sessions').upsert(
    {
      phone_label: sessionLabel,
      state: 'CONNECTING',
      updated_at: new Date().toISOString()
    },
    { onConflict: 'phone_label' }
  );
}

export function getCurrentQR() {
  return currentQR;
}

export async function sendMessage(jid: string, text: string) {
  if (!sock) throw new Error('Session not started');
  await sock.sendMessage(jid, { text });

  // opcional: persistir mensagem OUT
  const { data: chat } = await supa
    .from('wa_chats')
    .select('id')
    .eq('wa_id', jid)
    .maybeSingle();

  let chatId = chat?.id as string | undefined;
  if (!chatId) {
    const ins = await supa
      .from('wa_chats')
      .insert({ wa_id: jid, is_group: jid.endsWith('@g.us') })
      .select('id')
      .single();
    chatId = ins.data?.id;
  }

  await supa.from('wa_messages').insert({
    chat_id: chatId,
    direction: 'OUT',
    sender_wa_id: 'me',
    body: text,
    timestamp: new Date().toISOString()
  });
}
