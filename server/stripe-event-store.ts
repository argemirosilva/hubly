import { pgTable, varchar, timestamp, boolean } from 'drizzle-orm/pg-core';

// Controle local, fora do catálogo de replicação do Manus.
export const stripeWebhookEvents = pgTable('stripe_webhook_events', {
  id: varchar('id', { length: 255 }).primaryKey(),
  type: varchar('type', { length: 100 }).notNull(),
  livemode: boolean('livemode').notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }).defaultNow().notNull(),
});
