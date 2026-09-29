create table if not exists public.lscc_state (
  id bigint primary key,
  revision bigint not null default 0,
  db jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.lscc_state enable row level security;
-- No public policies are created. The server uses the Supabase service-role key.

insert into public.lscc_state (id, revision, db)
values (1, 0, '{"income":[],"expenses":[],"projects":[],"members":[],"partners":[],"homeCells":[],"programs":[],"programArchive":[],"events":[],"specialDepartments":[],"specialMembers":[],"specialIncome":[],"specialExpenses":[],"mercyIncome":[],"mercyExpenses":[],"officeSchedule":[],"deletedTransactions":[],"counters":{"member":0,"receipt":0,"voucher":0,"audit":0},"incomeTypes":["Offering","Tithe","Thanksgiving","Special Offering","Other"],"expenseTypes":["Utilities","Transport","Staff / Ministry","Maintenance","Events","Office","Construction","Other"],"settings":{"name":"LSCC Finance Manager","currency":"KSh","openingBalance":0,"partnerTarget":0},"users":[{"id":"u-admin","username":"admin","name":"System Administrator","role":"Administrator","email":"","passwordHash":"3f56650c7d6e50dead95cc014265034126dbfee52c8682a10d028bc76a7f9d31","permissions":[]}]}')
on conflict (id) do nothing;
