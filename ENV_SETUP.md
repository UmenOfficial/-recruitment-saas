# Environment Variables Template

Copy this file to `.env.local` and fill in your actual values.

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Encryption Key (AES-256 requires 32 bytes / 64 hex characters)
# Generate using: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=your-64-character-hex-encryption-key-here

# Application Settings
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Setup Instructions

1. Create a Supabase project at https://supabase.com
2. Copy your project URL and anon key from the project settings
3. Generate an encryption key using the command above
4. Create `.env.local` file with these values
