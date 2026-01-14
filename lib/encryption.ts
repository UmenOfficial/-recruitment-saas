/**
 * AES-256 Encryption Utility for PIPA Compliance
 * 
 * This module provides encryption and decryption functions for sensitive PII data
 * in compliance with Korea's Personal Information Protection Act (PIPA).
 * 
 * Security Features:
 * - AES-256-GCM encryption (authenticated encryption)
 * - Random IV (Initialization Vector) for each encryption
 * - Authentication tag to prevent tampering
 * 
 * @module lib/encryption
 */

import crypto from 'crypto';

// Algorithm configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 16 bytes for AES
// const AUTH_TAG_LENGTH = 16; // 16 bytes for GCM auth tag
// const SALT_LENGTH = 64; // For key derivation

/**
 * Get encryption key from environment variable
 * The key must be 32 bytes (64 hex characters) for AES-256
 */
function getEncryptionKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;

    if (!key) {
        throw new Error('ENCRYPTION_KEY environment variable is not set');
    }

    if (key.length !== 64) {
        throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
    }

    return Buffer.from(key, 'hex');
}

/**
 * Encrypt sensitive data using AES-256-GCM
 * 
 * @param plaintext - The data to encrypt (e.g., phone number, address)
 * @returns Encrypted string in format: iv:authTag:encryptedData (all hex-encoded)
 * 
 * @example
 * ```typescript
 * const encryptedPhone = encrypt('010-1234-5678');
 * // Returns: "a1b2c3d4....:e5f6g7h8....:i9j0k1l2...."
 * ```
 */
export function encrypt(plaintext: string): string {
    if (!plaintext) {
        throw new Error('Cannot encrypt empty string');
    }

    try {
        const key = getEncryptionKey();

        // Generate random IV for this encryption
        const iv = crypto.randomBytes(IV_LENGTH);

        // Create cipher
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

        // Encrypt the data
        let encrypted = cipher.update(plaintext, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        // Get authentication tag (GCM mode)
        const authTag = cipher.getAuthTag();

        // Return format: iv:authTag:encryptedData
        return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt data');
    }
}

/**
 * Decrypt data that was encrypted with the encrypt() function
 * 
 * @param encryptedData - The encrypted string (format: iv:authTag:encryptedData)
 * @returns Decrypted plaintext string
 * 
 * @example
 * ```typescript
 * const phone = decrypt(encryptedPhone);
 * // Returns: "010-1234-5678"
 * ```
 */
export function decrypt(encryptedData: string): string {
    if (!encryptedData) {
        throw new Error('Cannot decrypt empty string');
    }

    try {
        const key = getEncryptionKey();

        // Parse the encrypted data format
        const parts = encryptedData.split(':');
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted data format');
        }

        const [ivHex, authTagHex, encrypted] = parts;

        // Convert hex strings back to buffers
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');

        // Create decipher
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);

        // Decrypt the data
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt data');
    }
}

/**
 * Mask sensitive data for display (PIPA compliance - Blind Mode)
 * 
 * @param data - The data to mask
 * @param type - Type of data ('name', 'phone', 'email', 'address')
 * @returns Masked string
 * 
 * @example
 * ```typescript
 * maskData('홍길동', 'name')      // Returns: "홍**"
 * maskData('010-1234-5678', 'phone')  // Returns: "010-****-5678"
 * maskData('hong@example.com', 'email') // Returns: "ho**@example.com"
 * ```
 */
export function maskData(data: string, type: 'name' | 'phone' | 'email' | 'address'): string {
    if (!data) return '';

    switch (type) {
        case 'name':
            // Mask all characters except first one
            // Example: "홍길동" -> "홍**"
            if (data.length <= 1) return data;
            return data[0] + '*'.repeat(Math.min(data.length - 1, 2));

        case 'phone':
            // Mask middle digits
            // Example: "010-1234-5678" -> "010-****-5678"
            const phonePattern = /(\d{2,3})-?(\d{3,4})-?(\d{4})/;
            const match = data.match(phonePattern);
            if (match) {
                return `${match[1]}-****-${match[3]}`;
            }
            return data.substring(0, 3) + '****' + data.substring(data.length - 4);

        case 'email':
            // Mask part of username
            // Example: "hong@example.com" -> "ho**@example.com"
            const [username, domain] = data.split('@');
            if (!domain) return data;
            const visibleChars = Math.min(2, Math.floor(username.length / 2));
            return username.substring(0, visibleChars) + '**@' + domain;

        case 'address':
            // Mask detailed address, keep only city/district
            // Example: "서울시 강남구 테헤란로 123" -> "서울시 강남구 ****"
            const parts = data.split(' ');
            if (parts.length <= 2) return data;
            return parts.slice(0, 2).join(' ') + ' ****';

        default:
            return data;
    }
}

/**
 * Generate a random encryption key (for initial setup)
 * This should be run once and stored in .env.local
 * 
 * @returns 64-character hex string (32 bytes)
 */
export function generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash data using SHA-256 (for non-reversible hashing, e.g., passwords)
 * Note: For passwords, use bcrypt or argon2 instead
 * 
 * @param data - Data to hash
 * @returns SHA-256 hash (hex string)
 */
export function hashData(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
}
