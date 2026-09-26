import { db } from '../store/store.ts';
import type { AuditLog } from '../types/index.ts';

export class AuditService {
  static async log(
    adminId: string,
    adminEmail: string,
    action: string,
    entity: string,
    entityId: string,
    oldValue?: any,
    newValue?: any,
    ip: string = 'internal'
  ): Promise<AuditLog> {
    const logEntry = await db.addAuditLog({
      adminId,
      adminEmail,
      action,
      entity,
      entityId,
      oldValue: typeof oldValue === 'object' ? JSON.stringify(oldValue) : oldValue,
      newValue: typeof newValue === 'object' ? JSON.stringify(newValue) : newValue,
      ip,
    });

    return logEntry;
  }

  static async getLogs(limit: number = 100): Promise<AuditLog[]> {
    const logs = await db.getAuditLogs();
    return logs.slice(0, limit);
  }
}
