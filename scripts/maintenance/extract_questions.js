const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Env variables are missing.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to escape CSV values
function escapeCSV(val) {
    if (val === null || val === undefined) return '';
    let str = String(val);
    // Replace double quotes with two double quotes
    str = str.replace(/"/g, '""');
    // If value contains comma, double quote or newline, wrap it in double quotes
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str}"`;
    }
    return str;
}

async function extractQuestions() {
    console.log('Fetching personality questions from database...');
    
    const { data: questions, error } = await supabase
        .from('questions')
        .select('id, category, content, is_reverse_scored')
        .eq('type', 'PERSONALITY')
        .order('category', { ascending: true })
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Failed to fetch questions:', error.message);
        return;
    }

    console.log(`Found ${questions.length} personality questions.`);

    // 1. Save as JSON
    const jsonPath = path.resolve(__dirname, 'current_personality_questions.json');
    fs.writeFileSync(jsonPath, JSON.stringify(questions, null, 2), 'utf-8');
    console.log(`✅ Saved JSON to: ${jsonPath}`);

    // 2. Save as CSV (Excel compatible)
    const csvPath = path.resolve(__dirname, 'current_personality_questions.csv');
    let csvContent = 'id,category,content,is_reverse_scored\n';
    
    questions.forEach(q => {
        const row = [
            escapeCSV(q.id),
            escapeCSV(q.category),
            escapeCSV(q.content),
            escapeCSV(q.is_reverse_scored)
        ].join(',');
        csvContent += row + '\n';
    });

    fs.writeFileSync(csvPath, csvContent, 'utf-8');
    console.log(`✅ Saved CSV to: ${csvPath}`);
}

extractQuestions();
