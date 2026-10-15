-- Shared Brandify master product catalog.
-- Run this once in the Supabase SQL Editor for the existing project.

create table if not exists public.brandify_products (
    id text primary key,
    data jsonb not null,
    updated_at timestamptz not null default now()
);

alter table public.brandify_products enable row level security;

drop policy if exists "Public users can read the product catalog" on public.brandify_products;
drop policy if exists "Authenticated users can read the product catalog" on public.brandify_products;
create policy "Public users can read the product catalog"
    on public.brandify_products for select to anon, authenticated
    using (true);

drop policy if exists "Admins can add products to the catalog" on public.brandify_products;
create policy "Admins can add products to the catalog"
    on public.brandify_products for insert to authenticated
    with check ((select public.is_brandify_admin()));

drop policy if exists "Admins can update products in the catalog" on public.brandify_products;
create policy "Admins can update products in the catalog"
    on public.brandify_products for update to authenticated
    using ((select public.is_brandify_admin()))
    with check ((select public.is_brandify_admin()));

drop policy if exists "Admins can remove products from the catalog" on public.brandify_products;
create policy "Admins can remove products from the catalog"
    on public.brandify_products for delete to authenticated
    using ((select public.is_brandify_admin()));

grant select on public.brandify_products to anon, authenticated;
grant insert, update, delete on public.brandify_products to authenticated;

do $$
begin
    if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
       and not exists (
            select 1 from pg_publication_tables
            where pubname = 'supabase_realtime'
              and schemaname = 'public'
              and tablename = 'brandify_products'
       ) then
        alter publication supabase_realtime add table public.brandify_products;
    end if;
end;
$$;
