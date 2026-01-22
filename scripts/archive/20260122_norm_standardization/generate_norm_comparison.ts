
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const STANDARD_TEST_ID = 'a724bab1-b7e2-4b99-a5a3-8ae47cd9411e';
const GLOBAL_TEST_ID = '8afa34fb-6300-4c5e-bc48-bbdb74c717d8';

async function generateComparison() {
    console.log('--- Generating Comparison ... ---');

    // 1. Find NIS Test
    const { data: nisTests } = await supabase.from('tests').select('id, title').ilike('title', '%NIS Customizing%').limit(1);
    const nisTest = nisTests?.[0];

    if (!nisTest) {
        console.error('NIS Test not found');
        return;
    }

    // 2. Fetch Data
    // Standard: Local + Global
    const { data: stdLocal } = await supabase.from('test_norms').select('*').eq('test_id', STANDARD_TEST_ID);
    const { data: stdGlobal } = await supabase.from('test_norms').select('*').eq('test_id', GLOBAL_TEST_ID).like('category_name', 'Scale_%');

    // NIS: Local (It has everything locally now)
    const { data: nisNorms } = await supabase.from('test_norms').select('*').eq('test_id', nisTest.id);

    // 3. Process Standard Maps
    const stdMap = new Map<string, any>();
    stdLocal?.forEach((n: any) => stdMap.set(n.category_name, n));
    stdGlobal?.forEach((n: any) => stdMap.set(n.category_name, n));

    // 4. Process NIS Map
    const nisMap = new Map<string, any>();
    nisNorms?.forEach((n: any) => nisMap.set(n.category_name, n));

    // 5. Collect All Keys
    const allKeys = new Set([...stdMap.keys(), ...nisMap.keys()]);
    const sortedKeys = Array.from(allKeys).sort();

    // 6. Build Markdown Table
    let md = `# 규준 비교표 (Norm Comparison)\n\n`;
    md += `- **표준 인성검사**: Standard Personality Test\n`;
    md += `- **국가정보원**: ${nisTest.title}\n\n`;

    // Section 1: Competencies (Comp_*)
    md += `## 1. 역량 (Competencies)\n\n`;
    md += `| 항목명 (Category) | 표준검사 (Mean / SD) | 국가정보원 (Mean / SD) | 비고 |\n`;
    md += `| :--- | :---: | :---: | :--- |\n`;

    sortedKeys.filter(k => k.startsWith('Comp_')).forEach(k => {
        const std = stdMap.get(k);
        const nis = nisMap.get(k);

        const stdStr = std ? `${std.mean_value} / ${std.std_dev_value}` : '-';
        const nisStr = nis ? `${nis.mean_value} / ${nis.std_dev_value}` : '-';
        const diff = (std && nis && (std.mean_value !== nis.mean_value || std.std_dev_value !== nis.std_dev_value)) ? '⚠️ 차이 있음' : '';

        md += `| **${k.replace('Comp_', '')}** | ${stdStr} | ${nisStr} | ${diff} |\n`;
    });

    // Section 2: Scales (Scale_*)
    md += `\n## 2. 척도 (Scales)\n\n`;
    md += `| 항목명 (Category) | 표준검사 (Global) | 국가정보원 (Local) | 비고 |\n`;
    md += `| :--- | :---: | :---: | :--- |\n`;

    const scales = sortedKeys.filter(k => k.startsWith('Scale_'));
    scales.forEach(k => {
        const std = stdMap.get(k);
        const nis = nisMap.get(k);

        const stdStr = std ? `${std.mean_value} / ${std.std_dev_value}` : '-';
        const nisStr = nis ? `${nis.mean_value} / ${nis.std_dev_value}` : '-';

        // Exact floating point comparison might be tricky, checking string representation
        const isDiff = stdStr !== '-' && nisStr !== '-' && stdStr !== nisStr;
        const note = isDiff ? '⚠️ **값 다름**' : '';

        md += `| ${k.replace('Scale_', '')} | ${stdStr} | ${nisStr} | ${note} |\n`;
    });

    console.log(md);

    // Optional: save to file for tool reading
    // fs.writeFileSync('norm_comparison.md', md);
}

generateComparison();
