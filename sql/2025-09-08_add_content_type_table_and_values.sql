-- Create content_type_lookup table if it does not exist, and seed standard content types
-- Apply in Supabase SQL editor or psql

create table if not exists public.content_type_lookup (
	id integer primary key,
	name text not null unique
);

-- Seed values (id must match frontend constants)
insert into public.content_type_lookup (id, name) values
	(1, 'MOVIE'),
	(2, 'GAME'),
	(3, 'TV'),
	(4, 'BOOK')
on conflict (id) do update set name = excluded.name;

-- Optional: Add FK if content table has content_type_lookup_id and RLS allows
-- alter table if exists public.content
--   add constraint content_content_type_lookup_fk
--   foreign key (content_type_lookup_id) references public.content_type_lookup(id);

