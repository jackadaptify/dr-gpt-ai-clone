
// MOCKING VITE ENV with REAL KEYS (from .env)
(global as any).import = {
    meta: {
        env: {
            VITE_OPENROUTER_API_KEY: 'mock_key', // Not used directly, fetched from DB
            VITE_SUPABASE_URL: 'https://ehtwnuvnywqhnlylcpee.supabase.co',
            VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVodHdudXZueXdxaG5seWxjcGVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MDg1NjksImV4cCI6MjA2OTM4NDU2OX0.dBbbVYlw73xnGFNkzct7p26krW1Vvu1NXs0msbjkLhA'
        }
    }
};

import { classifyQuery } from './classifierService.ts';
import { orchestrateResearch } from './orchestratorService.ts';

async function verifyLogic() {
    const query = "Tratamento para insuficiência cardíaca com fração de ejeção reduzida SEM usar betabloqueadores";

    console.log("---------------------------------------------------");
    console.log("🔍 TESTING QUERY:", query);
    console.log("---------------------------------------------------");

    // 1. Test Classification
    console.log("\n[1] Testing Classifier...");
    try {
        const intent = await classifyQuery(query);
        console.log("✅ Classification Result:");
        console.log(JSON.stringify(intent, null, 2));

        if (intent.search_queries.strict.includes("insuficiência")) {
            console.error("❌ FAILURE: Strict query contains Portuguese words!");
        } else {
            console.log("✅ Success: Strict query appears to be translated.");
        }

    } catch (e) {
        console.error("❌ Classifier Generation Failed:", e);
    }

    // 2. Test Orchestration (Mocking providers via logic check)
    // We will actually run the orchestration to see the console logs we added
    console.log("\n[2] Testing Orchestrator (Full Flow)...");
    try {
        const result = await orchestrateResearch(query, (status) => console.log(`[UI Status]: ${status}`));
        if (result.sources.length === 0) {
            console.error("❌ FAILURE: Zero results returned.");
        } else {
            console.log(`✅ SUCCESS: Found ${result.sources.length} sources.`);
            result.sources.forEach(s => console.log(`   - [${s.source}] ${s.title}`));
        }
    } catch (e) {
        console.error("❌ Orchestrator Failed:", e);
    }
}

verifyLogic();
