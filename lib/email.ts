import nodemailer from 'nodemailer';

// Configure Nodemailer transporter
// NOTE: In production, these should be environment variables.
// For MVP, we assume they are provided in .env.local
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
    if (!process.env.SMTP_USER) {
        console.warn('⚠️ SMTP_USER not set. Email simulation mode.');
        console.log(`[Email Mock] To: ${to}, Subject: ${subject}`);
        return;
    }

    try {
        const info = await transporter.sendMail({
            from: `"MEETUP Platform" <${process.env.SMTP_USER}>`,
            to,
            subject,
            html,
        });
        console.log('Message sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
}
