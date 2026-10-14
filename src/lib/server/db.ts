import "server-only";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { DATABASE_URL, requireConfig } from "./env";

let client: NeonQueryFunction<false, false> | null = null;
let schemaReady: Promise<void> | null = null;

/** Neon over HTTP: one round trip per query, no pool to manage in serverless functions. */
export async function db() {
  client ??= neon(requireConfig(DATABASE_URL, "DATABASE_URL"));
  // Same statements as db/schema.sql, so a fresh Neon database works without a manual migration.
  schemaReady ??= ensureSchema(client).catch((e) => {
    schemaReady = null;
    throw e;
  });
  await schemaReady;
  return client;
}

async function ensureSchema(sql: NeonQueryFunction<false, false>) {
  await sql`
    create table if not exists launches (
      id              uuid primary key default gen_random_uuid(),
      mirror_group    uuid,
      mirror_count    int,
      launchpad_id    text not null,
      chain           text not null,
      name            text not null,
      symbol          text not null,
      description     text not null default '',
      image_url       text not null default '',
      metadata_uri    text,
      creator         text not null,
      privy_user_id   text not null,
      mint_address    text,
      tx_hash         text,
      status          text not null check (status in ('success', 'pending', 'failed')),
      error           text,
      details         jsonb not null default '{}'::jsonb,
      market_cap_usd  double precision not null default 0,
      market_cap_at   timestamptz,
      created_at      timestamptz not null default now()
    )`;
  await sql`create index if not exists launches_created_at_idx on launches (created_at desc)`;
  await sql`create index if not exists launches_creator_idx on launches (creator)`;
  await sql`create unique index if not exists launches_chain_tx_idx on launches (chain, tx_hash) where tx_hash is not null`;
}
