

create table if not exists public.profiles (
    user_id uuid primary key references auth.users (id) on delete cascade,
    creator_key text not null unique,
    full_name text not null default '',
    phone text not null default '',
    email text not null unique,
    brand_name text not null default '',
    status text not null default 'Active',
    created_at timestamptz not null default now()
);

alter table public.profiles
    add column if not exists status text not null default 'Active';

create table if not exists public.admin_users (
    user_id uuid primary key references public.profiles (user_id) on delete cascade,
    created_at timestamptz not null default now()
);

create table if not exists public.brandify_records (
    owner_id uuid not null references public.profiles (user_id) on delete cascade,
    record_type text not null check (record_type in ('order_request', 'order', 'notification')),
    record_id text not null,
    data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (owner_id, record_type, record_id)
);

create index if not exists brandify_records_type_updated_idx
    on public.brandify_records (record_type, updated_at desc);

create or replace function public.is_brandify_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.admin_users
        where user_id = (select auth.uid())
    );
$$;

revoke all on function public.is_brandify_admin() from public;
grant execute on function public.is_brandify_admin() to authenticated;

create or replace function public.create_brandify_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (user_id, creator_key, full_name, phone, email)
    values (
        new.id,
        'creator-' || regexp_replace(lower(coalesce(new.email, '')), '[^a-z0-9]+', '-', 'g'),
        coalesce(new.raw_user_meta_data ->> 'full_name', ''),
        coalesce(new.raw_user_meta_data ->> 'phone', ''),
        lower(coalesce(new.email, ''))
    )
    on conflict (user_id) do update set
        full_name = excluded.full_name,
        phone = excluded.phone,
        email = excluded.email;
    return new;
end;
$$;

drop trigger if exists on_brandify_auth_user_created on auth.users;
create trigger on_brandify_auth_user_created
    after insert or update on auth.users
    for each row execute procedure public.create_brandify_profile();

alter table public.profiles enable row level security;
alter table public.admin_users enable row level security;
alter table public.brandify_records enable row level security;

drop policy if exists "Creators and admins can read profiles" on public.profiles;
create policy "Creators and admins can read profiles"
    on public.profiles for select to authenticated
    using ((select auth.uid()) = user_id or (select public.is_brandify_admin()));

drop policy if exists "Creators can update their own profile" on public.profiles;
create policy "Creators can update their own profile"
    on public.profiles for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

drop policy if exists "Admins can update creator status" on public.profiles;
create policy "Admins can update creator status"
    on public.profiles for update to authenticated
    using ((select public.is_brandify_admin()))
    with check ((select public.is_brandify_admin()));

drop policy if exists "Admins can read their own admin role" on public.admin_users;
create policy "Admins can read their own admin role"
    on public.admin_users for select to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "Creators and admins can read records" on public.brandify_records;
create policy "Creators and admins can read records"
    on public.brandify_records for select to authenticated
    using ((select auth.uid()) = owner_id or (select public.is_brandify_admin()));

drop policy if exists "Creators and admins can create records" on public.brandify_records;
create policy "Creators and admins can create records"
    on public.brandify_records for insert to authenticated
    with check ((select auth.uid()) = owner_id or (select public.is_brandify_admin()));

drop policy if exists "Creators and admins can update records" on public.brandify_records;
create policy "Creators and admins can update records"
    on public.brandify_records for update to authenticated
    using ((select auth.uid()) = owner_id or (select public.is_brandify_admin()))
    with check ((select auth.uid()) = owner_id or (select public.is_brandify_admin()));

drop policy if exists "Creators and admins can delete records" on public.brandify_records;
create policy "Creators and admins can delete records"
    on public.brandify_records for delete to authenticated
    using ((select auth.uid()) = owner_id or (select public.is_brandify_admin()));

grant select on public.profiles to authenticated;
grant update (full_name, phone, brand_name) on public.profiles to authenticated;
grant update (status) on public.profiles to authenticated;
grant select on public.admin_users to authenticated;
grant select, insert, update, delete on public.brandify_records to authenticated;

do $$
begin
    if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
       and not exists (
            select 1 from pg_publication_tables
            where pubname = 'supabase_realtime'
              and schemaname = 'public'
              and tablename = 'brandify_records'
       ) then
        alter publication supabase_realtime add table public.brandify_records;
    end if;
    if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
       and not exists (
            select 1 from pg_publication_tables
            where pubname = 'supabase_realtime'
              and schemaname = 'public'
              and tablename = 'profiles'
       ) then
        alter publication supabase_realtime add table public.profiles;
    end if;
end;
$$;

-- To grant admin access after creating the admin user in Supabase Auth,
-- run this separately after replacing the email with your admin email:
--
-- insert into public.admin_users (user_id)
-- select user_id from public.profiles where email = 'admin@brandify.com'
-- on conflict do nothing;
