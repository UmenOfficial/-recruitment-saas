
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Better for admin checks if available

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase Environment Variables');
    process.exit(1);
}

// Use Service Key if available to bypass RLS, otherwise Anon
const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseKey);

async function checkUser(email: string) {
    console.log(`Checking role for: ${email}`);

    // 1. Check User Role in 'users' table
    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

    if (error) {
        console.error('Error fetching user:', error.message);
        return;
    }

    if (!user) {
        console.log('User not found in database.');
        return;
    }

    console.log('--- User Profile ---');
    console.log(`ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Global Role: ${user.role}`);
    console.log('--------------------');

    // 2. Check Company Affiliation
    const { data: membership, error: memberError } = await supabase
        .from('company_members')
        .select('role, company_id, companies(name)')
        .eq('user_id', user.id);

    if (memberError) {
        console.error('Error fetching membership:', memberError.message);
    } else if (membership && membership.length > 0) {
        console.log('--- Company Affiliation ---');
        membership.forEach((m: any) => {
            console.log(`Company: ${m.companies?.name} (ID: ${m.company_id})`);
            console.log(`Company Role: ${m.role}`);
        });
    } else {
        console.log('No Company Affiliation found (Not a Corporate Admin member).');
    }
}

checkUser('prodaum6660@gmail.com').then(() => {
    console.log("Done.");
}).catch(e => console.error(e));
