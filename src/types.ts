// Eventos enviados pelo servidor via WebSocket para o frontend
export type WSEvent =
  | { type: 'qr'; payload: { qr: string } }
  | { type: 'session.state'; payload: { state: SessionState } }
  | { type: 'message.new'; payload: UINewMessageEvent };

export type SessionState = 'DISCONNECTED' | 'QR' | 'CONNECTING' | 'CONNECTED';

// Sessão de WhatsApp salva no Supabase
export interface WASession {
  id?: string;
  phone_label: string;
  state: SessionState;
  qr_code?: string | null;
  session_data?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

// Contato
export interface WAContact {
  id?: string;
  session_id?: string;
  wa_id: string;       // ex: "5511999999999@s.whatsapp.net"
  name?: string;
  phone?: string;
  created_at?: string;
}

// Chat/Conversa
export interface WAChat {
  id?: string;
  session_id?: string;
  wa_id: string;       // JID do chat
  title?: string;
  is_group?: boolean;
  created_at?: string;
}

// Mensagem (persistência)
export interface WADBMessage {
  id?: string;
  session_id?: string;
  chat_id?: string;
  wa_msg_id?: string;
  direction: 'IN' | 'OUT';
  sender_wa_id?: string;
  body?: string;
  media?: Record<string, any>;
  timestamp?: string;
}

// Payload amigável para o frontend quando chega mensagem nova
export interface UINewMessageEvent {
  chatJid: string;
  isGroup: boolean;
  waMsgId: string;
  from: string;          // jid de quem enviou
  text: string;
  when: string;          // ISO
}
