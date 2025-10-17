// Representa uma sessão de WhatsApp
export interface WASession {
  id?: string;
  phone_label: string;
  state: 'DISCONNECTED' | 'QR' | 'CONNECTING' | 'CONNECTED';
  qr_code?: string | null;
  session_data?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

// Representa um contato
export interface WAContact {
  id?: string;
  session_id?: string;
  wa_id: string;       // ex: "5511999999999@s.whatsapp.net"
  name?: string;
  phone?: string;
  created_at?: string;
}

// Representa um chat/conversa
export interface WAChat {
  id?: string;
  session_id?: string;
  wa_id: string;       // JID do chat
  title?: string;
  is_group?: boolean;
  created_at?: string;
}

// Representa uma mensagem
export interface WAMessage {
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
