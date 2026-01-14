import { z } from 'zod';

// ============================================================================
// 1. Personal Info (Mixed PII & Plain)
// ============================================================================
export const personalInfoSchema = z.object({
    name: z.string().min(1, '이름을 입력해주세요'),
    dob: z.string().refine((val) => !isNaN(Date.parse(val)), '올바른 날짜 형식이 아닙니다'), // YYYY-MM-DD
    gender: z.enum(['Male', 'Female']),
    phone: z.string().min(1, '전화번호를 입력해주세요'), // Encrypted in DB
    email: z.string().email('올바른 이메일 형식이 아닙니다'), // Encrypted in DB
    address: z.string().min(1, '주소를 입력해주세요'), // Encrypted in DB
    photo_url: z.string().optional(),
});

// ============================================================================
// 2. Education
// ============================================================================
export const educationSchema = z.object({
    school_name: z.string().min(1, '학교명을 입력해주세요'),
    major: z.string().min(1, '전공을 입력해주세요'),
    admission_date: z.string().min(1, '입학년월을 입력해주세요'),
    graduation_date: z.string().min(1, '졸업년월을 입력해주세요'),
    status: z.enum(['Graduated', 'Attending', 'Leave', 'Dropout']),
    gpa: z.coerce.number().optional(), // Allow empty string -> undefined in UI, but if number provided check it
});

// ============================================================================
// 3. Work Experience
// ============================================================================
export const workExperienceSchema = z.object({
    company_name: z.string().min(1, '회사명을 입력해주세요'),
    department: z.string().min(1, '부서를 입력해주세요'),
    position: z.string().min(1, '직급/직책을 입력해주세요'),
    period_start: z.string().min(1, '시작일을 입력해주세요'),
    period_end: z.string().optional(), // Optional for currently employed
    is_current: z.boolean().optional(),
    job_details: z.string().optional(),
    resignation_reason: z.string().optional(),
    salary: z.string().optional(),
});

// ============================================================================
// 4. Skills & Qualifications
// ============================================================================
export const certificationSchema = z.object({
    name: z.string().min(1, '자격증명을 입력해주세요'),
    issuer: z.string().min(1, '발행처를 입력해주세요'),
    date: z.string().min(1, '취득일을 입력해주세요'),
    pass_status: z.string().optional(),
});

export const languageSchema = z.object({
    language: z.string().min(1, '언어를 선택/입력해주세요'),
    test_name: z.string().optional(),
    score_level: z.string().min(1, '점수/급수를 입력해주세요'),
    date: z.string().optional(),
});

export const techSkillSchema = z.object({
    tool_name: z.string().min(1, '기술/툴 이름을 입력해주세요'),
    proficiency_level: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Expert']),
});

// ============================================================================
// 5. Activities (Internships, Awards, etc.)
// ============================================================================
export const activitySchema = z.object({
    activity_name: z.string().min(1, '활동명을 입력해주세요'),
    organization: z.string().min(1, '기관/단체명을 입력해주세요'),
    period_start: z.string().min(1, '시작일을 입력해주세요'),
    period_end: z.string().optional(),
    description: z.string().optional(),
});

// ============================================================================
// 6. Self-Introduction
// ============================================================================
// Type A: Free text (single field)
export const selfIntroTypeASchema = z.object({
    content: z.string().min(10, '자기소개를 10자 이상 입력해주세요'),
});

// Type B: Q&A (Dynamic keys based on config, but for storage we use an array)
export const selfIntroQAItemSchema = z.object({
    question_id: z.string(),
    question_text: z.string(),
    answer: z.string().min(1, '답변을 입력해주세요'),
});

// ============================================================================
// 7. Portfolio & Attachments
// ============================================================================
export const attachmentSchema = z.object({
    type: z.enum(['Resume', 'Transcript', 'Certificate', 'Portfolio', 'Other']),
    file_url: z.string().min(1),
    file_name: z.string(),
});

// ============================================================================
// 8. Veteran & Military
// ============================================================================
export const militarySchema = z.object({
    veteran_status: z.boolean(),
    military_status: z.enum(['Served', 'Exempt', 'NotApplicable', 'Unfinished']),
    // details (dates/rank) could be added if needed
});

// ============================================================================
// 9. Preferences
// ============================================================================
export const preferencesSchema = z.object({
    job_type: z.enum(['Full-time', 'Contract', 'Internship', 'Freelance']),
    desired_location: z.string().optional(),
    desired_salary: z.string().optional(),
    is_negotiable: z.boolean().optional(),
});

// ============================================================================
// MAIN APPLICATION FORM SCHEMA
// ============================================================================
export const applicationFormSchema = z.object({
    personal: personalInfoSchema,
    education: z.array(educationSchema).optional(),
    work_experience: z.array(workExperienceSchema).optional(),

    skills: z.object({
        certifications: z.array(certificationSchema).optional(),
        languages: z.array(languageSchema).optional(),
        tech_skills: z.array(techSkillSchema).optional(),
    }).optional(),

    activities: z.array(activitySchema).optional(),

    self_introduction: z.union([
        selfIntroTypeASchema,
        z.object({ items: z.array(selfIntroQAItemSchema) })
    ]).optional(),

    attachments: z.array(attachmentSchema).optional(),
    portfolio_url: z.string().url().optional().or(z.literal('')),

    military: militarySchema.optional(),
    preferences: preferencesSchema.optional(),
    privacy_agreement: z.boolean().refine(val => val === true, {
        message: '개인정보 수집 및 이용에 동의해야 합니다',
    }),
});

export type ApplicationFormData = z.infer<typeof applicationFormSchema>;

// Helper Types for individual sections
export type PersonalInfo = z.infer<typeof personalInfoSchema>;
export type Education = z.infer<typeof educationSchema>;
export type WorkExperience = z.infer<typeof workExperienceSchema>;
export type Activity = z.infer<typeof activitySchema>;
