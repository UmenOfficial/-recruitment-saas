
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function compareVersions() {
    console.log('--- Norm Version Comparison (Final Check) ---\n');

    // 1. Fetch Versions
    const { data: versions } = await supabase
        .from('test_norm_versions')
        .select('*')
        .in('version_name', ['NIS_260122', 'Standard_260122']);

    const nisVersion = versions?.find(v => v.version_name === 'NIS_260122');
    const stdVersion = versions?.find(v => v.version_name === 'Standard_260122');

    if (!nisVersion || !stdVersion) {
        console.error('Versions not found. Please ensure they were created.');
        return;
    }

    const nisNorms: any[] = nisVersion.active_norms_snapshot;
    const stdNorms: any[] = stdVersion.active_norms_snapshot;

    const nisMap = new Map(nisNorms.map(n => [n.category_name, n]));
    const stdMap = new Map(stdNorms.map(n => [n.category_name, n]));

    const allKeys = new Set([...nisMap.keys(), ...stdMap.keys()]);
    const sortedKeys = Array.from(allKeys).sort();

    // 2. Output MD Table
    let md = `| Category | Standard_260122 (Mean/SD) | NIS_260122 (Mean/SD) | Note |\n`;
    md += `| :--- | :---: | :---: | :--- |\n`;

    sortedKeys.forEach(key => {
        const s = stdMap.get(key);
        const n = nisMap.get(key);

        const sVal = s ? `${s.mean_value} / ${s.std_dev_value}` : '-';
        const nVal = n ? `${n.mean_value} / ${n.std_dev_value}` : '-';

        let note = '';
        if (!s) note = 'NIS Only';
        else if (!n) note = 'Standard Only';
        else if (s.mean_value !== n.mean_value || s.std_dev_value !== n.std_dev_value) note = '⚠️ Diff';

        // Highlight Scales vs Competencies
        const name = key.startsWith('Comp_') ? `**${key}**` : key.replace('Scale_', '');

        md += `| ${name} | ${sVal} | ${nVal} | ${note} |\n`;
    });

    console.log(md);
}

compareVersions();
