import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type { PublicSupabase } from './supabase/env';

/* =========================================================
   Live updates in the browser. The database broadcasts a
   short message on every change (see broadcast_change() in
   supabase/schema.sql); pages listen and refresh.
   supabase-js is loaded on demand, outside the main bundle.
   ========================================================= */

export type LiveStatus = 'connecting' | 'live' | 'offline';

export interface ChangeMessage {
  table: string;
  op: 'INSERT' | 'UPDATE' | 'DELETE';
  id: string;
  no?: string;
  total?: number;
  status?: string;
  name?: string;
  rating?: number;
}

let client: Promise<SupabaseClient> | null = null;

export function browserSupabase(cfg: PublicSupabase) {
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(cfg.url, cfg.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    }));
  return client;
}

interface ListenOptions {
  /** Broadcast channels to join. */
  topics: string[];
  /** Tables to also follow through the supabase_realtime publication (row level security applies). */
  tables?: string[];
  onChange: (msg: ChangeMessage) => void;
  onStatus?: (status: LiveStatus) => void;
}

/** Joins the channels and calls back on every change. Returns a function that leaves them. */
export function listen(cfg: PublicSupabase, { topics, tables = [], onChange, onStatus }: ListenOptions) {
  let stopped = false;
  let db: SupabaseClient | null = null;
  const channels: RealtimeChannel[] = [];
  const states = new Map<string, LiveStatus>();
  const report = () => {
    const all = [...states.values()];
    onStatus?.(all.length && all.every(s => s === 'live') ? 'live' : all.some(s => s === 'offline') ? 'offline' : 'connecting');
  };
  onStatus?.('connecting');

  browserSupabase(cfg).then(c => {
    if (stopped) return;
    db = c;
    const track = (name: string, ch: RealtimeChannel) => {
      states.set(name, 'connecting');
      ch.subscribe(status => {
        states.set(name, status === 'SUBSCRIBED' ? 'live' : status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' ? 'offline' : 'connecting');
        report();
      });
      channels.push(ch);
    };
    for (const topic of topics) {
      track(topic, c.channel(topic, { config: { private: false } })
        .on('broadcast', { event: 'change' }, ({ payload }) => onChange(payload as ChangeMessage)));
    }
    if (tables.length) {
      let ch = c.channel(`db-${Math.random().toString(36).slice(2)}`);
      for (const table of tables) {
        ch = ch.on('postgres_changes', { event: '*', schema: 'public', table }, p => {
          const row = (p.new && Object.keys(p.new).length ? p.new : p.old) as { id?: string };
          onChange({ table, op: p.eventType, id: String(row?.id ?? '') });
        });
      }
      track('db', ch);
    }
  }).catch(() => onStatus?.('offline'));

  return () => {
    stopped = true;
    for (const ch of channels) db?.removeChannel(ch);
  };
}
