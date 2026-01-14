
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Missing Supabase environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyQuestions() {
    console.log('Starting verification...');

    // 1. Check total count of Personality questions
    const { count: questionCount, error: countError } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'PERSONALITY');

    if (countError) {
        console.error('Error counting questions:', countError);
    } else {
        console.log(`\n[Check 1] Total Personality Questions: ${questionCount}`);
        if (questionCount === 216) {
            console.log('✅ Count matches expected (216).');
        } else {
            console.log('❌ Count mismatch! Expected 216.');
        }
    }

    // 2. Check Test Linkage
    // Get all personality tests first
    const { data: tests, error: testError } = await supabase
        .from('tests')
        .select('id, title, type')
        .eq('type', 'PERSONALITY');

    if (testError) {
        console.error('Error fetching tests:', testError);
        return;
    }

    console.log(`\n[Check 2] Checking Links for ${tests?.length} Personality Tests:`);

    for (const test of tests || []) {
        const { count: linkCount, error: linkError } = await supabase
            .from('test_questions')
            .select('*', { count: 'exact', head: true })
            .eq('test_id', test.id);

        if (linkError) {
            console.error(`Error checking links for test ${test.title}:`, linkError);
        } else {
            console.log(`\n---------------------------------------------------`);
            console.log(`Test: "${test.title}" (ID: ${test.id})`);
            console.log(`- Questions Linked: ${linkCount} (Expected: 216)`);

            if (linkCount === 216) {
                console.log('  ✅ Linkage OK');
            } else {
                console.log('  ❌ Linkage Mismatch');
            }

            if (test.title.includes('NIS') || test.title.includes('Standard')) {
                // Check Norms
                const { count: normCount } = await supabase
                    .from('test_norms')
                    .select('*', { count: 'exact', head: true })
                    .eq('test_id', test.id);

                console.log(`- Norms (규준): ${normCount}`);
                if (normCount && normCount > 0) {
                    console.log('  ✅ Norms OK');
                } else {
                    console.log('  ⚠️  Warning: No norms found!');
                }

                // Check Competencies
                const { count: compCount } = await supabase
                    .from('competencies')
                    .select('*', { count: 'exact', head: true })
                    .eq('test_id', test.id);

                console.log(`- Competencies (역량방정식): ${compCount}`);
                if (compCount && compCount > 0) {
                    console.log('  ✅ Competencies OK');
                } else {
                    console.log('  ⚠️  Warning: No competencies found!');
                }
            }
        }
    }
}

verifyQuestions();
