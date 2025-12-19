
// debug_pubmed_queries.ts

// Mock fetch for node environment if needed, or use npx tsx which has fetch global in Node 18+
async function testPubMedQuery(label: string, searchTerm: string) {
    const baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';

    console.log(`\n🔍 Teste: ${label}`);
    console.log('Query:', searchTerm);

    try {
        const url = `${baseUrl}esearch.fcgi?db=pubmed&term=${encodeURIComponent(searchTerm)}&retmode=json`;
        const response = await fetch(url);
        const data = await response.json();
        const count = data.esearchresult?.count || "Error";
        console.log('📊 Resultados encontrados:', count);
        return count;
    } catch (error) {
        console.error('❌ Erro na requisição:', error);
        return "Error";
    }
}

async function runDiagnostics() {
    console.log("===== DIAGNÓSTICO DE QUERIES PUBMED =====");

    // 1. Query Simples (Baseline)
    await testPubMedQuery(
        '1. Baseline (Termos em Inglês)',
        'heart failure reduced ejection fraction'
    );

    // 2. Query com "NOT" (Hipótese de falha do usuário)
    await testPubMedQuery(
        '2. Strict Exclusion (NOT beta-blockers)',
        'heart failure reduced ejection fraction AND NOT beta-blockers' // Note: "AND NOT" or just "NOT"
    );

    // 3. Query com "NOT" usando MeSH (Mais formal)
    await testPubMedQuery(
        '3. MeSH Exclusion',
        '("Heart Failure"[MeSH] OR "HFrEF") NOT ("Adrenergic beta-Antagonists"[MeSH])'
    );

    // 4. Query Relaxada (Alternativas)
    await testPubMedQuery(
        '4. Relaxed (Alternatives)',
        'heart failure reduced ejection fraction AND (alternative OR contraindication OR "cannot use") AND beta-blockers'
    );

    // 5. Query REAL que estava falhando (Provável Português)
    await testPubMedQuery(
        '5. Query FALHA (Provável Português)',
        'Tratamento para insuficiência cardíaca com fração de ejeção reduzida SEM usar betabloqueadores'
    );
}

runDiagnostics();
