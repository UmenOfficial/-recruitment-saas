const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: .env.local 파일에서 NEXT_PUBLIC_SUPABASE_URL 및 SUPABASE_SERVICE_ROLE_KEY를 찾을 수 없습니다.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAdmin() {
    const email = process.argv[2];
    const password = process.argv[3];

    if (!email || !password) {
        console.log('사용법: node scripts/create_admin.js <email> <password>');
        console.log('예시: node scripts/create_admin.js admin@meetup.com securePass123!');
        process.exit(1);
    }

    console.log(`Creating admin user: ${email}...`);

    const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // 자동 이메일 인증 처리
        user_metadata: { role: 'admin' }
    });

    if (error) {
        console.error('Failed to create user:', error.message);
    } else {
        console.log('✅ Admin user created successfully!');
        console.log('User ID:', data.user.id);
        console.log('Email:', data.user.email);
    }
}

createAdmin();
