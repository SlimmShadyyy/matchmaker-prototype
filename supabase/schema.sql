
create table if not exists customer_notes (
  id          text primary key,
  client_id   text not null,
  author      text not null,
  note_text   text not null,
  created_at  timestamptz not null default now()
);
create index if not exists customer_notes_client_idx on customer_notes (client_id, created_at desc);

create table if not exists client_state (
  client_id    text primary key,
  status_tag   text,
  preferences  jsonb,
  updated_at   timestamptz not null default now()
);

create table if not exists shortlists (
  client_id     text not null,
  candidate_id  text not null,
  created_at    timestamptz not null default now(),
  primary key (client_id, candidate_id)
);

create table if not exists sent_matches (
  client_id     text not null,
  candidate_id  text not null,
  score         integer not null,
  pitch         jsonb not null,
  sent_at       timestamptz not null default now(),
  primary key (client_id, candidate_id)
);

alter table customer_notes enable row level security;
alter table client_state   enable row level security;
alter table shortlists     enable row level security;
alter table sent_matches   enable row level security;
