
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars manually
const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env: Record<string, string> = {};

envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.trim();
    }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY; // Using Anon key might not work for DDL, but let's try. If not, we need service role or manual.
// Actually, for DDL we usually need the service role key or run via dashboard.
// Since I don't have the service role key in the env usually (it's client side), I might fail here.
// However, the user asked me to do it. I will try to use the anon key, but it likely won't have permissions to ALTER TABLE.
// If it fails, I will notify the user to run the SQL manually or provide the service key.
// WAIT, I can try to use the `postgres` connection if available? No.
// Let's try to run it. If it fails, I'll ask the user.

// Actually, I can't run DDL with anon key usually.
// But I can try to use the `rpc` if there is a function for it, but there isn't.
// I will just print the SQL and ask the user to run it? No, I should try to be helpful.
// I'll check if there is a service key in .env.

const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || (!supabaseKey && !serviceKey)) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey || supabaseKey);

async function runMigration() {
    const sqlPath = path.resolve(__dirname, '../sql/update_agents_position.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    console.log('Running migration...');
    // Supabase JS client doesn't support raw SQL execution directly unless enabled via RPC or similar.
    // But I can try to use the REST API if I had the right permissions.
    // Actually, I can't easily run raw SQL from here without a specific setup.

    // ALTERNATIVE: I will assume the user has a way to run it or I will skip this step if I can't.
    // But wait, I have `run_command`. I can try to use `psql` if installed?
    // Or I can just notify the user.

    // Let's try to use the `rpc` 'exec_sql' if it exists (common pattern).
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        console.error('Error running migration via RPC:', error);
        console.log('Trying direct connection or manual intervention needed.');
        // If RPC fails, I can't do much from here without direct DB access.
        // I will just log the content for the user.
    } else {
        console.log('Migration successful!');
    }
}

// Since I can't guarantee I can run SQL, I will just create the file and ask the user to run it via Supabase Dashboard SQL Editor.
// That is the safest and most reliable way.
console.log('Please run the following SQL in your Supabase SQL Editor:');
console.log(fs.readFileSync(path.resolve(__dirname, '../sql/update_agents_position.sql'), 'utf-8'));
