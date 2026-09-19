import { db } from '../db/store.ts';
import type { AuditLog } from '../types/index.ts';
import { supabaseService } from '../db/supabase.ts';

export class AuditService {
  static log(
    adminId: string,
    adminEmail: string,
    action: string,
    entity: string,
    entityId: string,
    oldValue?: any,
    newValue?: any,
    ip: string = 'internal'
  ): AuditLog {
    const logEntry = db.addAuditLog({
      adminId,
      adminEmail,
      action,
      entity,
      entityId,
      oldValue: oldValue !== undefined ? (typeof oldValue === 'string' ? oldValue : JSON.stringify(oldValue)) : undefined,
      newValue: newValue !== undefined ? (typeof newValue === 'string' ? newValue : JSON.stringify(newValue)) : undefined,
      ip,
    });

    // Real-time synchronization with Supabase
    supabaseService.syncAuditLogRealtime(logEntry).catch(console.error);

    return logEntry;
  }

  static async getLogs(limit: number = 100): Promise<AuditLog[]> {
    const client = supabaseService.getClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);
        
        if (!error && data) {
          return data.map(log => ({
            id: log.id,
            adminId: log.admin_id,
            adminEmail: log.admin_email,
            action: log.action,
            entity: log.entity_type,
            entityId: log.entity_id,
            oldValue: typeof log.old_value === 'string' ? log.old_value : JSON.stringify(log.old_value),
            newValue: typeof log.new_value === 'string' ? log.new_value : JSON.stringify(log.new_value),
            ip: log.ip_address,
            timestamp: log.created_at
          }));
        }
      } catch (err) {
        console.warn('[AuditService Supabase Error]:', err);
      }
    }
    return db.auditLogs.slice(0, limit);
  }
}
