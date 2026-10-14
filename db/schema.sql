-- MirrorPad schema for Neon (Postgres). The app also creates this on first use (src/lib/server/db.ts);
-- run it by hand only if you want the table in place before the first request.

create table if not exists launches (
  id              uuid primary key default gen_random_uuid(),
  mirror_group    uuid,                 -- legs of one mirror run share this
  mirror_count    int,
  launchpad_id    text not null,
  chain           text not null,        -- robinhood | solana | base | bsc
  name            text not null,
  symbol          text not null,
  description     text not null default '',
  image_url       text not null default '',
  metadata_uri    text,
  creator         text not null,        -- signing wallet on that chain
  privy_user_id   text not null,
  mint_address    text,                 -- null for review submissions and hand-offs
  tx_hash         text,
  status          text not null check (status in ('success', 'pending', 'failed')),
  error           text,
  details         jsonb not null default '{}'::jsonb,  -- venue extras: issuer, jurisdiction, links
  market_cap_usd  double precision not null default 0,
  market_cap_at   timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists launches_created_at_idx on launches (created_at desc);
create index if not exists launches_creator_idx on launches (creator);
create unique index if not exists launches_chain_tx_idx on launches (chain, tx_hash) where tx_hash is not null;
