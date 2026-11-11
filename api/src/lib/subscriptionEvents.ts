import { db } from '../db/index.ts';
import { subscriptionEvents } from '../db/schema.ts';
import { id } from './ids.ts';

/** Append one history row. Never updates or deletes existing events. */
export async function recordSubscriptionEvent(row: {
  userId: string;
  subscriptionId?: string | null;
  plan: string;
  status: string;
  provider: string;
  source: string;
  createdAt?: Date;
}): Promise<void> {
  await db
    .insert(subscriptionEvents)
    .values({
      id: id('sev_'),
      userId: row.userId,
      subscriptionId: row.subscriptionId ?? null,
      plan: row.plan,
      status: row.status,
      provider: row.provider,
      source: row.source,
      createdAt: row.createdAt ?? new Date(),
    })
    .run();
}
