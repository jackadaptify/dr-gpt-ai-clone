
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
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAgents() {
    console.log('Fetching agents...');
    const { data, error } = await supabase
        .from('agents')
        .select('*');

    if (error) {
        console.error('Error fetching agents:', error);
        return;
    }

    console.log(`Found ${data.length} agents.`);
    data.forEach(agent => {
        console.log(`Agent: ${agent.name}`);
        console.log(`  ID: ${agent.id}`);
        console.log(`  Avatar URL (DB): '${agent.avatar_url}'`);
        console.log('---');
    });
}

checkAgents();
