/**
 * Encryption Utility Tests
 * 
 * Run this script to test the encryption/decryption functionality
 * Usage: npx tsx lib/encryption.test.ts
 */

import { encrypt, decrypt, maskData, generateEncryptionKey } from './encryption';

console.log('🔐 Testing Encryption Utilities\n');

// Test 1: Generate encryption key
console.log('1. Generate Encryption Key:');
const testKey = generateEncryptionKey();
console.log(`   Generated key: ${testKey}`);
console.log(`   Length: ${testKey.length} characters (should be 64)\n`);

// Test 2: Encrypt and decrypt
console.log('2. Encrypt/Decrypt Test:');
const testData = [
    { label: 'Phone Number', value: '010-1234-5678' },
    { label: 'Email', value: 'hong@example.com' },
    { label: 'Address', value: '서울시 강남구 테헤란로 123' },
    { label: 'Name', value: '홍길동' },
];

testData.forEach(({ label, value }) => {
    try {
        const encrypted = encrypt(value);
        const decrypted = decrypt(encrypted);
        const isMatch = value === decrypted;

        console.log(`   ${label}:`);
        console.log(`     Original:  ${value}`);
        console.log(`     Encrypted: ${encrypted.substring(0, 50)}...`);
        console.log(`     Decrypted: ${decrypted}`);
        console.log(`     ✓ Match: ${isMatch ? '✅' : '❌'}\n`);
    } catch (error) {
        console.error(`     ❌ Error: ${error}\n`);
    }
});

// Test 3: Data masking
console.log('3. Data Masking Test (PIPA Compliance):');
const maskTests = [
    { type: 'name' as const, value: '홍길동' },
    { type: 'name' as const, value: 'John Doe' },
    { type: 'phone' as const, value: '010-1234-5678' },
    { type: 'phone' as const, value: '01012345678' },
    { type: 'email' as const, value: 'hong@example.com' },
    { type: 'address' as const, value: '서울시 강남구 테헤란로 123' },
];

maskTests.forEach(({ type, value }) => {
    const masked = maskData(value, type);
    console.log(`   ${type.toUpperCase()}: ${value} → ${masked}`);
});

console.log('\n✅ All tests completed!');
