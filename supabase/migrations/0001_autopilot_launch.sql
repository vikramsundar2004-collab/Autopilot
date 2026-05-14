create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_name text not null,
  platform text not null,
  app_version text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.sync_metadata (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null,
  account_label text,
  last_synced_at timestamptz,
  status text not null default 'disconnected',
  error_summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source)
);

create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null default 'free',
  status text not null default 'active',
  limits jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, plan)
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'classic',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.devices enable row level security;
alter table public.sync_metadata enable row level security;
alter table public.entitlements enable row level security;
alter table public.user_settings enable row level security;

drop policy if exists "profiles are readable by owner" on public.profiles;
drop policy if exists "profiles are editable by owner" on public.profiles;
drop policy if exists "devices are owner scoped" on public.devices;
drop policy if exists "sync metadata is owner scoped" on public.sync_metadata;
drop policy if exists "entitlements are owner readable" on public.entitlements;
drop policy if exists "user settings are owner scoped" on public.user_settings;

create policy "profiles are readable by owner"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles are editable by owner"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "devices are owner scoped"
  on public.devices for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "sync metadata is owner scoped"
  on public.sync_metadata for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "entitlements are owner readable"
  on public.entitlements for select
  using (auth.uid() = user_id);

create policy "user settings are owner scoped"
  on public.user_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  status text not null default 'active' check (status in ('active', 'removed')),
  joined_at timestamptz not null default now(),
  removed_at timestamptz,
  unique (organization_id, user_id)
);

create table if not exists public.organization_invite_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  key_hash text not null,
  version integer not null default 1,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  rotated_at timestamptz,
  unique (organization_id, version)
);

create table if not exists public.chat_channels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  kind text not null default 'channel' check (kind in ('channel', 'dm')),
  ai_notes_enabled boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_channel_members (
  channel_id uuid not null references public.chat_channels(id) on delete cascade,
  member_id uuid not null references public.organization_members(id) on delete cascade,
  last_read_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (channel_id, member_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel_id uuid not null references public.chat_channels(id) on delete cascade,
  sender_member_id uuid not null references public.organization_members(id) on delete cascade,
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_mentions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  mentioned_member_id uuid not null references public.organization_members(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (message_id, mentioned_member_id)
);

create table if not exists public.chat_notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recipient_member_id uuid not null references public.organization_members(id) on delete cascade,
  message_id uuid references public.chat_messages(id) on delete cascade,
  kind text not null default 'mention',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_ai_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel_id uuid not null references public.chat_channels(id) on delete cascade,
  summary text not null,
  decisions jsonb not null default '[]'::jsonb,
  blockers jsonb not null default '[]'::jsonb,
  created_by_ai boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_action_suggestions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel_id uuid not null references public.chat_channels(id) on delete cascade,
  source_message_id uuid references public.chat_messages(id) on delete set null,
  assignee_member_id uuid references public.organization_members(id) on delete set null,
  title text not null,
  summary text not null,
  route text not null default 'productivity' check (route in ('productivity', 'design', 'coding', 'automation')),
  confidence integer not null default 0 check (confidence >= 0 and confidence <= 100),
  status text not null default 'suggested' check (status in ('suggested', 'accepted', 'ignored')),
  route_reason text,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  ignored_at timestamptz
);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_invite_keys enable row level security;
alter table public.chat_channels enable row level security;
alter table public.chat_channel_members enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_mentions enable row level security;
alter table public.chat_notifications enable row level security;
alter table public.chat_ai_notes enable row level security;
alter table public.chat_action_suggestions enable row level security;

create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members member
    where member.organization_id = target_org
      and member.user_id = auth.uid()
      and member.status = 'active'
  )
  or exists (
    select 1
    from public.organizations organization
    where organization.id = target_org
      and organization.owner_user_id = auth.uid()
  );
$$;

create or replace function public.is_org_admin(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members member
    where member.organization_id = target_org
      and member.user_id = auth.uid()
      and member.status = 'active'
      and member.role in ('owner', 'admin')
  )
  or exists (
    select 1
    from public.organizations organization
    where organization.id = target_org
      and organization.owner_user_id = auth.uid()
  );
$$;

drop policy if exists "organizations are member scoped" on public.organizations;
drop policy if exists "organizations are owner insertable" on public.organizations;
drop policy if exists "organization members are member scoped" on public.organization_members;
drop policy if exists "invite keys are admin scoped" on public.organization_invite_keys;
drop policy if exists "chat channels are member scoped" on public.chat_channels;
drop policy if exists "chat channel members are member scoped" on public.chat_channel_members;
drop policy if exists "chat messages are member scoped" on public.chat_messages;
drop policy if exists "chat mentions are member scoped" on public.chat_mentions;
drop policy if exists "chat notifications are recipient scoped" on public.chat_notifications;
drop policy if exists "chat ai notes are member scoped" on public.chat_ai_notes;
drop policy if exists "chat action suggestions are member scoped" on public.chat_action_suggestions;

create policy "organizations are member scoped"
  on public.organizations for select
  using (public.is_org_member(id));

create policy "organizations are owner insertable"
  on public.organizations for insert
  with check (owner_user_id = auth.uid());

create policy "organization members are member scoped"
  on public.organization_members for all
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id) or user_id = auth.uid());

create policy "invite keys are admin scoped"
  on public.organization_invite_keys for all
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

create policy "chat channels are member scoped"
  on public.chat_channels for all
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy "chat channel members are member scoped"
  on public.chat_channel_members for all
  using (
    exists (
      select 1 from public.chat_channels channel
      where channel.id = channel_id
        and public.is_org_member(channel.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.chat_channels channel
      where channel.id = channel_id
        and public.is_org_member(channel.organization_id)
    )
  );

create policy "chat messages are member scoped"
  on public.chat_messages for all
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy "chat mentions are member scoped"
  on public.chat_mentions for all
  using (
    exists (
      select 1 from public.chat_messages message
      where message.id = message_id
        and public.is_org_member(message.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.chat_messages message
      where message.id = message_id
        and public.is_org_member(message.organization_id)
    )
  );

create policy "chat notifications are recipient scoped"
  on public.chat_notifications for all
  using (
    public.is_org_member(organization_id)
    and exists (
      select 1 from public.organization_members member
      where member.id = recipient_member_id
        and member.user_id = auth.uid()
    )
  )
  with check (public.is_org_member(organization_id));

create policy "chat ai notes are member scoped"
  on public.chat_ai_notes for all
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy "chat action suggestions are member scoped"
  on public.chat_action_suggestions for all
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
