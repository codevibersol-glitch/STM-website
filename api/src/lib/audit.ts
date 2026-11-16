import { db } from '../db/index.ts';
import { auditLog } from '../db/schema.ts';
import { redactSecrets } from './crm.ts';
import { id } from './ids.ts';

/** Append one audit row. Full license keys are masked before they are stored. */
export async function recordAudit(entry: {
  actorEmail: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  userId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  createdAt?: Date;
}): Promise<void> {
  await db
    .insert(auditLog)
    .values({
      id: id('aud_'),
      actorEmail: entry.actorEmail,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      userId: entry.userId ?? null,
      oldJson: pack(entry.oldValue),
      newJson: pack(entry.newValue),
      createdAt: entry.createdAt ?? new Date(),
    })
    .run();
}

function pack(value: unknown): string | null {
  if (value === undefined) return null;
  return JSON.stringify(redactSecrets(value));
}
