-- Enable RLS on the table (if not already enabled)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow all for messages" ON messages;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON messages;
DROP POLICY IF EXISTS "Enable read access for all users" ON messages;

-- Create a permissive policy for development/debugging
-- WARNING: This allows ANYONE to read/write messages. 
-- For production, you should restrict this to authenticated users or specific roles.
CREATE POLICY "Allow all for messages"
ON messages
FOR ALL
USING (true)
WITH CHECK (true);

-- Alternative: If you want to restrict to authenticated users only:
-- CREATE POLICY "Allow authenticated for messages"
-- ON messages
-- FOR ALL
-- TO authenticated
-- USING (true)
-- WITH CHECK (true);
