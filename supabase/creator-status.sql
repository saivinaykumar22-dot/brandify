-- Persist creator activation state so admin changes survive reloads/devices.
-- Run once in the Supabase SQL Editor.

alter table public.profiles
    add column if not exists status text not null default 'Active'
    check (status in ('Active', 'Inactive'));

drop policy if exists "Admins can update creator status" on public.profiles;
create policy "Admins can update creator status"
    on public.profiles for update to authenticated
    using ((select public.is_brandify_admin()))
    with check ((select public.is_brandify_admin()));

grant update (status) on public.profiles to authenticated;
