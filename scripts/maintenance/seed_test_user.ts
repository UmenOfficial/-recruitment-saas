
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseServiceKey) {
    console.error('Error: SUPABASE_SERVICE_ROLE_KEY is required to manage users.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestUser() {
    const email = 'test_candidate@umen.cloud';
    const password = 'test_candidate_password_123!';

    console.log(`Creating test user: ${email}`);

    // Check if user already exists
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
        console.error('Error listing users:', listError);
        return;
    }

    const existingUser = users.find(u => u.email === email);

    if (existingUser) {
        console.log('Test user already exists. ID:', existingUser.id);
        // Optional: Update password to ensure it matches
        const { error: updateError } = await supabase.auth.admin.updateUserById(
            existingUser.id,
            { password: password, email_confirm: true }
        );
        if (updateError) console.error('Error updating password:', updateError);
        else console.log('Password updated/confirmed.');

        return;
    }

    // Create user
    const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: 'Test Candidate' }
    });

    if (error) {
        console.error('Error creating user:', error);
    } else {
        console.log('Test user created successfully:', data.user.id);

        // Ensure entry in public.users table (if handled by trigger, might be automatic, but explicit check doesn't hurt)
        // Usually Supabase Auth -> public.users sync is via Triggers. 
        // We will assume the existing trigger handles it.
    }
}

createTestUser();
