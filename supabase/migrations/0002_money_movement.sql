create table if not exists public.money_movement_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  money_movement_enabled boolean not null default false,
  email_verified_for_payments boolean not null default false,
  verified_email text,
  provider text not null default 'stripe',
  test_mode_only boolean not null default true,
  live_mode_enabled boolean not null default false,
  stripe_connected_account_id text,
  stripe_connection_status text not null default 'not_connected'
    check (stripe_connection_status in ('not_connected', 'pending', 'connected', 'restricted', 'disabled')),
  stripe_account_email text,
  stripe_charges_enabled boolean not null default false,
  stripe_payouts_enabled boolean not null default false,
  stripe_details_submitted boolean not null default false,
  stripe_connected_at timestamptz,
  stripe_last_checked_at timestamptz,
  stripe_connect_state text unique,
  enabled_at timestamptz,
  disabled_at timestamptz,
  last_verification_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.money_movement_settings enable row level security;

drop policy if exists "money movement settings are owner scoped" on public.money_movement_settings;

create policy "money movement settings are owner scoped"
  on public.money_movement_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists money_movement_settings_stripe_state_idx
  on public.money_movement_settings (stripe_connect_state)
  where stripe_connect_state is not null;
