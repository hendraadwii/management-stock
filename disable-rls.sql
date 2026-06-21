-- ============================================================
-- DISABLE RLS & HAPUS SEMUA POLICIES
-- Aman dijalankan berkali-kali
-- ============================================================

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN (
    SELECT policyname, tablename FROM pg_policies 
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN (
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', tbl);
  END LOOP;
END $$;
