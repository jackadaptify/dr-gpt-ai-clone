
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ehtwnuvnywqhnlylcpee.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVodHdudXZueXdxaG5seWxjcGVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MDg1NjksImV4cCI6MjA2OTM4NDU2OX0.dBbbVYlw73xnGFNkzct7p26krW1Vvu1NXs0msbjkLhA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('Checking app_settings for enabled_models...');
    const { data, error } = await supabase.from('app_settings').select('*').eq('key', 'enabled_models');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Result:', JSON.stringify(data, null, 2));
    }
}

check();
