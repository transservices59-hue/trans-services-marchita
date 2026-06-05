import { createClient } from '@supabase/supabase-js';
import type { Request } from 'express';

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPA_SERVICE_KEY ?? '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

export interface AuditParams {
  action: string;           // ex. 'LOGIN_SUCCESS', 'CHECKOUT_CREATED', 'RATE_LIMIT'
  ressource: string;        // ex. 'auth', 'checkout', 'webhook'
  ressourceId?: string;
  details?: Record<string, unknown>;
  userId?: string;
  req?: Request;
}

function getIp(req?: Request): string | undefined {
  if (!req) return undefined;
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress;
}

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await supabase.from('audit_logs').insert({
      user_id:     params.userId ?? null,
      action:      params.action,
      ressource:   params.ressource,
      ressource_id: params.ressourceId ?? null,
      details:     params.details ?? null,
      ip_address:  getIp(params.req) ?? null,
    });
  } catch (err) {
    // Ne jamais bloquer une requête à cause d'un log raté
    console.error('[audit] Insert failed:', err instanceof Error ? err.message : err);
  }
}
