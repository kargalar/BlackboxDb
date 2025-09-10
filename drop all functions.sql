-- Drop all functions in a PostgreSQL schema (here is 'public' schema)
-- REF: Adapted from table dropping script for functions
do $$
declare
    func record;
begin
    for func in select oid::regprocedure as func_name from pg_proc where pronamespace = 'public'::regnamespace loop
        execute 'drop function ' || func.func_name || ' cascade';
    end loop;
end $$;
