-- Append-only responses to one immutable packet. No budget or project writes.
create table public.quote_responses (
 id uuid primary key default gen_random_uuid(),
 share_id uuid not null references public.quote_shares(id) on delete cascade,
 submitted_by uuid not null default auth.uid() references auth.users(id),
 amount_dkk numeric(14,2) not null check(amount_dkk >= 0 and amount_dkk <= 99999999999.99),
 price_type text not null check(price_type in ('fixed','estimate')),
 scope text not null check(char_length(btrim(scope)) between 1 and 5000),
 reservations text not null default '' check(char_length(reservations)<=3000),
 proposed_start date,
 proposed_end date,
 created_at timestamptz not null default now(),
 constraint quote_response_dates check(proposed_start is null or proposed_end is null or proposed_end>=proposed_start)
);
create index quote_responses_share_created_idx on public.quote_responses(share_id,created_at desc,id desc);
create index quote_responses_submitter_idx on public.quote_responses(submitted_by);
alter table public.quote_responses enable row level security;
revoke all on public.quote_responses from anon,authenticated;
grant select on public.quote_responses to authenticated;
-- Identity and timestamp cannot be supplied or changed by the browser.
grant insert(id,share_id,amount_dkk,price_type,scope,reservations,proposed_start,proposed_end) on public.quote_responses to authenticated;
create policy quote_responses_read on public.quote_responses for select to authenticated using (
 exists(select 1 from public.quote_shares share where share.id=quote_responses.share_id
 and ((share.revoked_at is null and share.recipient_email=(select app_private.verified_email()))
 or exists(select 1 from public.projects p where p.id=share.project_id and public.is_house_member(p.house_id))))
);
create policy quote_responses_submit on public.quote_responses for insert to authenticated with check (
 submitted_by=(select auth.uid())
 and exists(select 1 from public.quote_shares share where share.id=quote_responses.share_id
 and share.revoked_at is null and share.recipient_email=(select app_private.verified_email()))
);
