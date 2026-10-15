-- Grant Brandify admin access to the existing Supabase Auth user.
-- Run this in the SQL Editor of project wnbqizlbfxuhlgmeeobc.

insert into public.profiles (user_id, creator_key, full_name, phone, email)
select
    u.id,
    'creator-' || regexp_replace(lower(coalesce(u.email, '')), '[^a-z0-9]+', '-', 'g'),
    coalesce(u.raw_user_meta_data ->> 'full_name', ''),
    coalesce(u.raw_user_meta_data ->> 'phone', ''),
    lower(coalesce(u.email, ''))
from auth.users u
where lower(u.email) = lower('brandify169@gmail.com')
on conflict (user_id) do update set
    email = excluded.email;

insert into public.admin_users (user_id)
select user_id
from public.profiles
where lower(email) = lower('brandify169@gmail.com')
on conflict (user_id) do nothing;

-- Verify that the account now has the admin role.
select u.email, (a.user_id is not null) as admin_enabled
from auth.users u
left join public.admin_users a on a.user_id = u.id
where lower(u.email) = lower('brandify169@gmail.com');
