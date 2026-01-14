
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function createGlobalTest() {
    // 1. Check if it already exists
    const { data: existing } = await supabase
        .from('tests')
        .select('id')
        .eq('title', 'GLOBAL_NORMS_MASTER')
        .single();

    if (existing) {
        console.log(`GLOBAL_NORMS_MASTER already exists: ${existing.id}`);
        return;
    }

    // 2. Create it
    const { data: newTest, error } = await supabase
        .from('tests')
        .insert({
            title: 'GLOBAL_NORMS_MASTER',
            description: 'SYSTEM RESERVED: Holds global norms for Scales and Reliability. Do not delete.',
            type: 'PERSONALITY',
            status: 'ARCHIVED' // Prevent it from showing up in normal candidate lists
        })
        .select()
        .single();

    if (error) {
        console.error('Failed to create global test:', error);
        return;
    }

    console.log(`Created GLOBAL_NORMS_MASTER: ${newTest.id}`);
}

createGlobalTest();
