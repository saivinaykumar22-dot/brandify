-- Razorpay fulfillment payment ledger for the existing Brandify JSON order workflow.
-- Run after schema.sql. Amounts are stored as integer paise.

create table if not exists public.fulfillment_payments (
    id uuid primary key default gen_random_uuid(),
    brandify_order_id text not null unique,
    request_id text unique,
    creator_id uuid not null references public.profiles(user_id) on delete restrict,
    amount bigint not null check (amount > 0),
    currency text not null default 'INR' check (currency = 'INR'),
    payment_status text not null default 'Pending' check (payment_status in ('Pending','Paid','Failed','Refund Pending','Refunded')),
    razorpay_order_id text unique,
    razorpay_payment_id text unique,
    razorpay_refund_id text unique,
    razorpay_signature_verified boolean not null default false,
    order_creation_locked_at timestamptz,
    paid_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.fulfillment_payment_attempts (
    id uuid primary key default gen_random_uuid(),
    payment_id uuid not null references public.fulfillment_payments(id) on delete cascade,
    razorpay_order_id text not null,
    razorpay_payment_id text unique,
    status text not null default 'created' check (status in ('created','failed','paid')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.razorpay_webhook_events (
    event_id text primary key,
    event_type text not null,
    processed_at timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists fulfillment_payments_creator_created_idx on public.fulfillment_payments(creator_id, created_at desc);
create index if not exists fulfillment_payments_status_idx on public.fulfillment_payments(payment_status, updated_at desc);
create index if not exists fulfillment_payment_attempts_payment_idx on public.fulfillment_payment_attempts(payment_id, created_at desc);

alter table public.fulfillment_payments enable row level security;
alter table public.fulfillment_payment_attempts enable row level security;
alter table public.razorpay_webhook_events enable row level security;

drop policy if exists "Creators and admins read fulfillment payments" on public.fulfillment_payments;
create policy "Creators and admins read fulfillment payments" on public.fulfillment_payments
    for select to authenticated using (creator_id = (select auth.uid()) or (select public.is_brandify_admin()));
drop policy if exists "Creators and admins read payment attempts" on public.fulfillment_payment_attempts;
create policy "Creators and admins read payment attempts" on public.fulfillment_payment_attempts
    for select to authenticated using (exists (select 1 from public.fulfillment_payments p where p.id = payment_id and (p.creator_id = (select auth.uid()) or (select public.is_brandify_admin()))));
revoke all on public.fulfillment_payments, public.fulfillment_payment_attempts, public.razorpay_webhook_events from anon, authenticated;
grant select on public.fulfillment_payments, public.fulfillment_payment_attempts to authenticated;

-- Official order records are admin/service controlled. Creator cancellation uses the checked RPC below.
drop policy if exists "Creators and admins can create records" on public.brandify_records;
create policy "Creators and admins can create records" on public.brandify_records
    for insert to authenticated with check ((select public.is_brandify_admin()) or ((select auth.uid()) = owner_id and record_type <> 'order'));
drop policy if exists "Creators and admins can update records" on public.brandify_records;
create policy "Creators and admins can update records" on public.brandify_records
    for update to authenticated using ((select public.is_brandify_admin()) or ((select auth.uid()) = owner_id and record_type <> 'order'))
    with check ((select public.is_brandify_admin()) or ((select auth.uid()) = owner_id and record_type <> 'order'));
drop policy if exists "Creators and admins can delete records" on public.brandify_records;
create policy "Creators and admins can delete records" on public.brandify_records
    for delete to authenticated using ((select public.is_brandify_admin()) or ((select auth.uid()) = owner_id and record_type <> 'order'));

create or replace function public.creator_cancel_brandify_order(p_order_id text, p_reason text, p_notes text default '')
returns void language plpgsql security definer set search_path=public as $$
declare rec public.brandify_records; pay public.fulfillment_payments; now_at timestamptz := now();
begin
    select * into rec from public.brandify_records where owner_id=(select auth.uid()) and record_type='order' and record_id=p_order_id for update;
    if not found or rec.data->>'status' <> 'Processing' then raise exception 'Order is not eligible for cancellation'; end if;
    select * into pay from public.fulfillment_payments where brandify_order_id=p_order_id;
    if found and pay.payment_status='Paid' then raise exception 'Paid order requires a confirmed refund request first'; end if;
    if p_reason is null or p_reason='' then raise exception 'Cancellation reason required'; end if;
    update public.brandify_records set data = data || jsonb_build_object('status','Cancelled','cancelledBy','creator','cancelledAt',now_at,
      'cancellationReason',p_reason,'cancellationNotes',coalesce(p_notes,''),'paymentStatus',coalesce(pay.payment_status,data->>'paymentStatus'),
      'updatedAt',now_at,'statusHistory',coalesce(data->'statusHistory','[]'::jsonb) || jsonb_build_array(jsonb_build_object('status','Cancelled','changedBy','creator','timestamp',now_at,'reason',p_reason,'notes',coalesce(p_notes,'')))),
      updated_at=now_at where owner_id=(select auth.uid()) and record_type='order' and record_id=p_order_id;
end; $$;
revoke all on function public.creator_cancel_brandify_order(text,text,text) from public, anon;
grant execute on function public.creator_cancel_brandify_order(text,text,text) to authenticated;

-- Only an authorized admin can establish or change the trusted payable amount.
create or replace function public.admin_set_fulfillment_payment(p_order_id text, p_creator_id uuid, p_amount_paise bigint)
returns public.fulfillment_payments
language plpgsql security definer set search_path = public
as $$
declare result public.fulfillment_payments; approved_request_id text;
begin
    if not public.is_brandify_admin() then raise exception 'Admin access required'; end if;
    if p_order_id is null or p_order_id = '' or p_amount_paise <= 0 then raise exception 'Invalid order or amount'; end if;
    select data->>'requestId' into approved_request_id from public.brandify_records where record_type='order' and record_id=p_order_id and owner_id=p_creator_id;
    insert into public.fulfillment_payments(brandify_order_id, request_id, creator_id, amount, currency, payment_status)
    values(p_order_id, approved_request_id, p_creator_id, p_amount_paise, 'INR', 'Pending')
    on conflict (brandify_order_id) do update set
        amount = case when fulfillment_payments.payment_status = 'Paid' then fulfillment_payments.amount else excluded.amount end,
        creator_id = excluded.creator_id,
        updated_at = now()
    returning * into result;
    return result;
end;
$$;
revoke all on function public.admin_set_fulfillment_payment(text, uuid, bigint) from public, anon;
grant execute on function public.admin_set_fulfillment_payment(text, uuid, bigint) to authenticated;

create or replace function public.admin_remove_unpaid_fulfillment_payment(p_order_id text)
returns void language plpgsql security definer set search_path=public as $$
begin
    if not public.is_brandify_admin() then raise exception 'Admin access required'; end if;
    delete from public.fulfillment_payments where brandify_order_id=p_order_id and payment_status='Pending' and razorpay_order_id is null;
end; $$;
revoke all on function public.admin_remove_unpaid_fulfillment_payment(text) from public, anon;
grant execute on function public.admin_remove_unpaid_fulfillment_payment(text) to authenticated;

create sequence if not exists public.brandify_order_id_seq start with 1001;
create or replace function public.admin_generate_brandify_order_id()
returns text language plpgsql security definer set search_path=public as $$
declare candidate text;
begin
    if not public.is_brandify_admin() then raise exception 'Admin access required'; end if;
    loop
      candidate := 'BF-' || nextval('public.brandify_order_id_seq');
      exit when not exists(select 1 from public.brandify_records where record_type='order' and record_id=candidate)
        and not exists(select 1 from public.fulfillment_payments where brandify_order_id=candidate);
    end loop;
    return candidate;
end; $$;
revoke all on function public.admin_generate_brandify_order_id() from public, anon;
grant execute on function public.admin_generate_brandify_order_id() to authenticated;

-- Privileged finalizer used only by Edge Functions after signature/capture verification.
create or replace function public.finalize_razorpay_payment(p_order_id text, p_razorpay_order_id text, p_payment_id text)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare p public.fulfillment_payments; rec public.brandify_records;
begin
    select * into p from public.fulfillment_payments where brandify_order_id = p_order_id for update;
    if not found or p.razorpay_order_id <> p_razorpay_order_id then raise exception 'Payment order mismatch'; end if;
    if p.payment_status = 'Paid' then return p.razorpay_payment_id = p_payment_id; end if;
    if p.payment_status not in ('Pending','Failed') then raise exception 'Payment is not pending'; end if;
    update public.fulfillment_payments set payment_status='Paid', razorpay_payment_id=p_payment_id,
        razorpay_signature_verified=true, paid_at=now(), updated_at=now() where id=p.id;
    insert into public.fulfillment_payment_attempts(payment_id,razorpay_order_id,razorpay_payment_id,status)
      values(p.id,p_razorpay_order_id,p_payment_id,'paid') on conflict (razorpay_payment_id) do update set status='paid',updated_at=now();
    select * into rec from public.brandify_records where record_type='order' and record_id=p_order_id and owner_id=p.creator_id for update;
    if not found then raise exception 'Brandify order record missing'; end if;
    update public.brandify_records set data = data || jsonb_build_object(
      'status','Processing','paymentStatus','Paid','razorpayOrderId',p_razorpay_order_id,
      'razorpayPaymentId',p_payment_id,'paidAt',now(),'updatedAt',now(),
      'statusHistory',coalesce(data->'statusHistory','[]'::jsonb) || jsonb_build_array(jsonb_build_object('status','Processing','changedBy','payment','timestamp',now()))
    ), updated_at=now() where owner_id=p.creator_id and record_type='order' and record_id=p_order_id;
    return true;
end;
$$;
revoke all on function public.finalize_razorpay_payment(text,text,text) from public, anon, authenticated;
grant execute on function public.finalize_razorpay_payment(text,text,text) to service_role;

create or replace function public.attach_razorpay_order(p_order_id text, p_razorpay_order_id text)
returns public.fulfillment_payments
language plpgsql security definer set search_path = public
as $$
declare p public.fulfillment_payments;
begin
    select * into p from public.fulfillment_payments where brandify_order_id=p_order_id for update;
    if not found or p.payment_status not in ('Pending','Failed') then raise exception 'Payment not payable'; end if;
    update public.fulfillment_payments set razorpay_order_id=p_razorpay_order_id, payment_status='Pending', updated_at=now() where id=p.id returning * into p;
    update public.fulfillment_payments set order_creation_locked_at=null where id=p.id;
    insert into public.fulfillment_payment_attempts(payment_id, razorpay_order_id) values(p.id,p_razorpay_order_id);
    return p;
end;
$$;
revoke all on function public.attach_razorpay_order(text,text) from public, anon, authenticated;
grant execute on function public.attach_razorpay_order(text,text) to service_role;

create or replace function public.claim_razorpay_order_creation(p_order_id text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare p public.fulfillment_payments;
begin
    select * into p from public.fulfillment_payments where brandify_order_id=p_order_id for update;
    if not found or p.payment_status not in ('Pending','Failed') then raise exception 'Payment is not payable'; end if;
    if p.order_creation_locked_at is not null and p.order_creation_locked_at > now() - interval '2 minutes' then raise exception 'Payment is already starting'; end if;
    update public.fulfillment_payments set order_creation_locked_at=now(),payment_status='Pending',updated_at=now() where id=p.id;
    return jsonb_build_object('amount',p.amount,'razorpay_order_id',p.razorpay_order_id);
end; $$;
revoke all on function public.claim_razorpay_order_creation(text) from public, anon, authenticated;
grant execute on function public.claim_razorpay_order_creation(text) to service_role;

create or replace function public.release_razorpay_order_creation(p_order_id text)
returns void language sql security definer set search_path=public as $$
    update public.fulfillment_payments set order_creation_locked_at=null where brandify_order_id=p_order_id;
$$;
revoke all on function public.release_razorpay_order_creation(text) from public, anon, authenticated;
grant execute on function public.release_razorpay_order_creation(text) to service_role;

create or replace function public.retry_razorpay_payment(p_order_id text)
returns void language sql security definer set search_path=public as $$
    update public.fulfillment_payments set payment_status='Pending',order_creation_locked_at=null,updated_at=now()
      where brandify_order_id=p_order_id and payment_status in ('Pending','Failed') and razorpay_order_id is not null;
$$;
revoke all on function public.retry_razorpay_payment(text) from public, anon, authenticated;
grant execute on function public.retry_razorpay_payment(text) to service_role;

create or replace function public.record_razorpay_failure(p_razorpay_order_id text, p_payment_id text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare p public.fulfillment_payments;
begin
    select * into p from public.fulfillment_payments where razorpay_order_id=p_razorpay_order_id for update;
    if not found or p.payment_status in ('Paid','Refund Pending','Refunded') then return; end if;
    if p_payment_id is not null then
      insert into public.fulfillment_payment_attempts(payment_id,razorpay_order_id,razorpay_payment_id,status)
        values(p.id,p_razorpay_order_id,p_payment_id,'failed') on conflict (razorpay_payment_id) do update set status='failed',updated_at=now();
    end if;
    update public.fulfillment_payments set payment_status='Failed',razorpay_payment_id=coalesce(p_payment_id,razorpay_payment_id), updated_at=now() where id=p.id;
    update public.brandify_records set data=data || jsonb_build_object('paymentStatus','Failed','razorpayPaymentId',coalesce(p_payment_id,data->>'razorpayPaymentId'),'updatedAt',now()), updated_at=now()
      where owner_id=p.creator_id and record_type='order' and record_id=p.brandify_order_id;
end;
$$;
revoke all on function public.record_razorpay_failure(text,text) from public, anon, authenticated;
grant execute on function public.record_razorpay_failure(text,text) to service_role;

create or replace function public.claim_razorpay_webhook(p_event_id text, p_event_type text)
returns boolean language plpgsql security definer set search_path=public as $$
declare existing public.razorpay_webhook_events;
begin
    insert into public.razorpay_webhook_events(event_id,event_type) values(p_event_id,p_event_type) on conflict do nothing;
    if found then return true; end if;
    select * into existing from public.razorpay_webhook_events where event_id=p_event_id;
    return existing.processed_at is null;
end; $$;
revoke all on function public.claim_razorpay_webhook(text,text) from public, anon, authenticated;
grant execute on function public.claim_razorpay_webhook(text,text) to service_role;

create or replace function public.complete_razorpay_webhook(p_event_id text)
returns void language sql security definer set search_path=public as $$
    update public.razorpay_webhook_events set processed_at=now() where event_id=p_event_id;
$$;
revoke all on function public.complete_razorpay_webhook(text) from public, anon, authenticated;
grant execute on function public.complete_razorpay_webhook(text) to service_role;

create or replace function public.set_razorpay_refund_pending(p_order_id text, p_refund_id text)
returns void language plpgsql security definer set search_path=public as $$
begin
    update public.fulfillment_payments set payment_status='Refund Pending',razorpay_refund_id=case when p_refund_id='requested' then razorpay_refund_id else p_refund_id end, updated_at=now()
      where brandify_order_id=p_order_id and payment_status='Paid';
    if not found then raise exception 'Paid payment not found'; end if;
end; $$;
revoke all on function public.set_razorpay_refund_pending(text,text) from public, anon, authenticated;
grant execute on function public.set_razorpay_refund_pending(text,text) to service_role;

create or replace function public.confirm_razorpay_refund(p_payment_id text, p_refund_id text, p_refund_status text)
returns void language plpgsql security definer set search_path=public as $$
declare p public.fulfillment_payments; next_status text;
begin
    select * into p from public.fulfillment_payments where razorpay_payment_id=p_payment_id for update;
    if not found or p.payment_status <> 'Refund Pending' then return; end if;
    if p_refund_status='processed' then
      next_status := 'Refunded';
    elsif p_refund_status='failed' then
      next_status := 'Paid';
    else
      return;
    end if;
    update public.fulfillment_payments set payment_status=next_status,razorpay_refund_id=p_refund_id,updated_at=now()
      where id=p.id and payment_status='Refund Pending';
    update public.brandify_records set data=data || jsonb_build_object('paymentStatus',next_status,'updatedAt',now()),updated_at=now()
      where owner_id=p.creator_id and record_type='order' and record_id=p.brandify_order_id;
end; $$;
revoke all on function public.confirm_razorpay_refund(text,text,text) from public, anon, authenticated;
grant execute on function public.confirm_razorpay_refund(text,text,text) to service_role;

create or replace function public.finalize_paid_order_cancellation(p_order_id text, p_reason text, p_notes text default '', p_refund_id text default '')
returns void language plpgsql security definer set search_path=public as $$
declare pay public.fulfillment_payments; rec public.brandify_records; now_at timestamptz := now();
begin
    select * into pay from public.fulfillment_payments where brandify_order_id=p_order_id for update;
    if not found or pay.payment_status not in ('Refund Pending','Refunded') then raise exception 'Refund request is not pending'; end if;
    select * into rec from public.brandify_records where owner_id=pay.creator_id and record_type='order' and record_id=p_order_id for update;
    if not found or rec.data->>'status' <> 'Processing' then raise exception 'Order is not eligible for cancellation'; end if;
    update public.fulfillment_payments set razorpay_refund_id=nullif(p_refund_id,''),updated_at=now_at where id=pay.id;
    update public.brandify_records set data=data || jsonb_build_object('status','Cancelled','cancelledBy','creator','cancelledAt',now_at,
      'cancellationReason',p_reason,'cancellationNotes',coalesce(p_notes,''),'paymentStatus',pay.payment_status,'updatedAt',now_at,
      'statusHistory',coalesce(data->'statusHistory','[]'::jsonb) || jsonb_build_array(jsonb_build_object('status','Cancelled','changedBy','creator','timestamp',now_at,'reason',p_reason,'notes',coalesce(p_notes,'')))),
      updated_at=now_at where owner_id=pay.creator_id and record_type='order' and record_id=p_order_id;
end; $$;
revoke all on function public.finalize_paid_order_cancellation(text,text,text,text) from public, anon, authenticated;
grant execute on function public.finalize_paid_order_cancellation(text,text,text,text) to service_role;

