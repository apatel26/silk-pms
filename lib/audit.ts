import { createServerClient } from '@/lib/supabase';

interface AuditLogEntry {
  userId: string;
  username: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, any> | null;
  ip_address?: string | null;
}

export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = createServerClient();
    await supabase.from('audit_log').insert([
      {
        user_id: entry.userId || null,
        username: entry.username || 'System',
        action: entry.action,
        entity_type: entry.entity_type || null,
        entity_id: entry.entity_id || null,
        details: entry.details ? JSON.stringify(entry.details) : null,
        ip_address: entry.ip_address || null,
      },
    ]);
  } catch (error) {
    // Don't let audit logging failures break the main operation
    console.error('Failed to create audit log:', error);
  }
}