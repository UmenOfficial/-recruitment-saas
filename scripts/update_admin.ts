import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// 환경변수 또는 직접 입력으로 처리 (코드에 비밀번호 하드코딩 방지)
const OLD_EMAIL = process.env.OLD_ADMIN_EMAIL || 'prodaum6660@gmail.com';
const NEW_EMAIL = process.env.NEW_ADMIN_EMAIL || 'Adminofficial@Umen.com';
const NEW_PASSWORD = process.env.NEW_ADMIN_PASSWORD;

if (!NEW_PASSWORD) {
    console.error('Error: NEW_ADMIN_PASSWORD must be set in .env');
    process.exit(1);
}

async function updateAdmin() {
    console.log(`Searching for user: ${OLD_EMAIL}...`);

    // 1. Find the user by old email
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
        console.error('Error listing users:', listError);
        return;
    }

    const user = users.find(u => u.email === OLD_EMAIL);

    if (!user) {
        console.error(`User not found: ${OLD_EMAIL}`);

        // Optional: Check if the new email already exists
        const checkNew = users.find(u => u.email === NEW_EMAIL);
        if (checkNew) {
            console.log(`User with new email ${NEW_EMAIL} already exists. Updating password only.`);
            const { error: updateError } = await supabase.auth.admin.updateUserById(
                checkNew.id,
                { password: NEW_PASSWORD, email_confirm: true }
            );
            if (updateError) console.error('Error updating password:', updateError);
            else console.log('Password updated successfully.');
            return;
        }

        console.log('Creating new admin user since old one was not found...');
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: NEW_EMAIL,
            password: NEW_PASSWORD,
            email_confirm: true,
            user_metadata: { is_admin: true }
        });

        if (createError) console.error('Error creating user:', createError);
        else console.log(`Created new admin user: ${NEW_EMAIL} (${newUser.user.id})`);

        return;
    }

    console.log(`Found user ${user.id}. Updating email and password...`);

    // 2. Update the user
    const { data, error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        {
            email: NEW_EMAIL,
            password: NEW_PASSWORD,
            email_confirm: true,
            user_metadata: { ...user.user_metadata, is_admin: true }
        }
    );

    if (updateError) {
        console.error('Failed to update user:', updateError);
    } else {
        console.log('Successfully updated admin user.');
        console.log(`Old Email: ${OLD_EMAIL}`);
        console.log(`New Email: ${NEW_EMAIL}`);
        console.log('Password updated.');
    }
}

updateAdmin();
