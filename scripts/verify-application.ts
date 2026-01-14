import { applicationFormSchema } from '@/types/application-schema';
import { encrypt, decrypt } from '@/lib/encryption';

// Mock Data
const validMockData = {
    personal: {
        name: "Hong Gil Dong",
        dob: "1990-01-01",
        gender: "Male" as const,
        phone: "010-1234-5678",
        email: "test@example.com",
        address: "Seoul, Korea",
        photo_url: "https://example.com/photo.jpg"
    },
    education: [
        {
            school_name: "Seoul Univ",
            major: "CS",
            admission_date: "2010-03",
            graduation_date: "2014-02",
            status: "Graduated" as const,
            gpa: 4.0
        }
    ],
    portfolio_url: "https://portfolio.com",
    // ... other sections optional
};

async function runVerification() {
    console.log("--- 1. Testing Zod Validation ---");
    const result = applicationFormSchema.safeParse(validMockData);

    if (result.success) {
        console.log("✅ Validation Passed");
    } else {
        console.error("❌ Validation Failed", result.error);
    }

    console.log("\n--- 2. Testing Encryption ---");
    try {
        process.env.ENCRYPTION_KEY = 'a'.repeat(64); // Mock key for test

        const originalPhone = validMockData.personal.phone;
        const encrypted = encrypt(originalPhone);
        console.log("Encrypted:", encrypted);

        const decrypted = decrypt(encrypted);
        console.log("Decrypted:", decrypted);

        if (originalPhone === decrypted) {
            console.log("✅ Encryption/Decryption Cycle Working");
        } else {
            console.error("❌ Decrypted value does not match original");
        }
    } catch (e) {
        console.error("❌ Encryption Test Failed:", e);
    }
}

// Check if run directly
if (require.main === module) {
    runVerification();
}
