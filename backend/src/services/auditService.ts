import { db } from '../store/store.ts';
import type { AuditLog } from '../types/index.ts';

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

    return logEntry;
  }

  static async getLogs(limit: number = 100): Promise<AuditLog[]> {
    return db.auditLogs.slice(0, limit);
  }
}
