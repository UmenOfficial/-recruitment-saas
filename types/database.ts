/**
 * Database Type Definitions
 * 
 * This file contains TypeScript types that match the database schema (RBAC Enabled).
 * These types provide type safety when working with Supabase queries.
 * 
 * @module types/database
 */

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export type UserRole = 'SUPER_ADMIN' | 'CORPORATE_ADMIN' | 'EXTERNAL_EVALUATOR' | 'CANDIDATE' | 'ADMIN' | 'GUEST';
export type ApplicationStatus = 'APPLIED' | 'TEST_PENDING' | 'TEST_COMPLETED' | 'INTERVIEW' | 'PASS' | 'FAIL' | 'WITHDRAWN'
    | 'SUBMITTED' | 'DOCUMENT_PASS' | 'TEST_PASS' | 'INTERVIEW_PASS' | 'HIRED' | 'REJECTED';
export type EvaluationStatus = 'DRAFT' | 'SUBMITTED';
export type EvaluationStage = 'DOCUMENT' | 'INTERVIEW';
export type CompanyMemberRole = 'MASTER' | 'MEMBER';

export interface Database {
    public: {
        Tables: {
            companies: {
                Row: {
                    id: string;
                    name: string;
                    biz_registration_number: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    biz_registration_number?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    biz_registration_number?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            company_members: {
                Row: {
                    id: string;
                    company_id: string;
                    user_id: string;
                    role: CompanyMemberRole | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    company_id: string;
                    user_id: string;
                    role?: CompanyMemberRole | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    company_id?: string;
                    user_id?: string;
                    role?: CompanyMemberRole | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            users: {
                Row: {
                    id: string;
                    email: string;
                    encrypted_password: string | null;
                    role: UserRole;
                    full_name: string | null;
                    is_active: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    email: string;
                    encrypted_password?: string | null;
                    role: UserRole;
                    full_name?: string | null;
                    is_active?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    email?: string;
                    encrypted_password?: string | null;
                    role?: UserRole;
                    full_name?: string | null;
                    is_active?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            postings: {
                Row: {
                    id: string;
                    title: string;
                    description: string | null;
                    site_config: Json | null;
                    is_active: boolean;
                    deadline: string | null;
                    created_by: string | null;
                    company_id: string | null; // RBAC Link
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    title: string;
                    description?: string | null;
                    site_config?: Json | null;
                    is_active?: boolean;
                    deadline?: string | null;
                    created_by?: string | null;
                    company_id?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    title?: string;
                    description?: string | null;
                    site_config?: Json | null;
                    is_active?: boolean;
                    deadline?: string | null;
                    created_by?: string | null;
                    company_id?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            questions: {
                Row: {
                    id: string;
                    content: string;
                    image_url: string | null;
                    options: Json;
                    correct_answer: number;
                    score: number;
                    category: string | null;
                    difficulty: 'EASY' | 'MEDIUM' | 'HARD' | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    content: string;
                    image_url?: string | null;
                    options: Json;
                    correct_answer: number;
                    score?: number;
                    category?: string | null;
                    difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    content?: string;
                    image_url?: string | null;
                    options?: Json;
                    correct_answer?: number;
                    score?: number;
                    category?: string | null;
                    difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            applications: {
                Row: {
                    id: string;
                    user_id: string | null;
                    posting_id: string | null;
                    status: ApplicationStatus;
                    pii_phone_encrypted: string | null;
                    pii_address_encrypted: string | null;
                    pii_resident_id_encrypted: string | null;
                    pii_email_encrypted: string | null;
                    name: string | null;
                    dob: string | null;
                    gender: string | null;
                    photo_url: string | null;
                    resume_url: string | null;
                    portfolio_url: string | null;
                    custom_answers: Json | null;
                    application_data: Json | null;
                    data_retention_days: number;
                    consent_given_at: string;
                    blind_mode_enabled: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    user_id?: string | null;
                    posting_id?: string | null;
                    status?: ApplicationStatus;
                    pii_phone_encrypted?: string | null;
                    pii_address_encrypted?: string | null;
                    pii_resident_id_encrypted?: string | null;
                    resume_url?: string | null;
                    portfolio_url?: string | null;
                    custom_answers?: Json | null;
                    data_retention_days?: number;
                    consent_given_at?: string;
                    blind_mode_enabled?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string | null;
                    posting_id?: string | null;
                    status?: ApplicationStatus;
                    pii_phone_encrypted?: string | null;
                    pii_address_encrypted?: string | null;
                    pii_resident_id_encrypted?: string | null;
                    resume_url?: string | null;
                    portfolio_url?: string | null;
                    custom_answers?: Json | null;
                    data_retention_days?: number;
                    consent_given_at?: string;
                    blind_mode_enabled?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            test_results: {
                Row: {
                    id: string;
                    application_id: string | null;
                    started_at: string | null;
                    completed_at: string | null;
                    time_limit_minutes: number | null;
                    total_score: number;
                    max_score: number | null;
                    answers_log: Json | null;

                    violation_count: number;
                    violation_log: Json | null;
                    test_id: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    application_id?: string | null;
                    started_at?: string | null;
                    completed_at?: string | null;
                    time_limit_minutes?: number | null;
                    total_score?: number;
                    max_score?: number | null;
                    answers_log?: Json | null;
                    violation_count?: number;
                    violation_log?: Json | null;
                    test_id?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    application_id?: string | null;
                    started_at?: string | null;
                    completed_at?: string | null;
                    time_limit_minutes?: number | null;
                    total_score?: number;
                    max_score?: number | null;
                    answers_log?: Json | null;
                    violation_count?: number;
                    violation_log?: Json | null;
                    test_id?: string | null;
                    created_at?: string;
                };
            };
            audit_logs: {
                Row: {
                    id: string;
                    actor_id: string | null;
                    target_application_id: string | null;
                    action: string;
                    ip_address: string | null;
                    user_agent: string | null;
                    details: Json | null;
                    timestamp: string;
                };
                Insert: {
                    id?: string;
                    actor_id?: string | null;
                    target_application_id?: string | null;
                    action: string;
                    ip_address?: string | null;
                    user_agent?: string | null;
                    details?: Json | null;
                    timestamp?: string;
                };
                Update: {
                    id?: string;
                    actor_id?: string | null;
                    target_application_id?: string | null;
                    action?: string;
                    ip_address?: string | null;
                    user_agent?: string | null;
                    details?: Json | null;
                    timestamp?: string;
                };
            };
            guest_access_tokens: {
                Row: {
                    id: string;
                    guest_user_id: string | null;
                    token: string;
                    posting_id: string | null;
                    expires_at: string;
                    is_revoked: boolean;
                    is_masked: boolean;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    guest_user_id?: string | null;
                    token: string;
                    posting_id?: string | null;
                    expires_at: string;
                    is_revoked?: boolean;
                    is_masked?: boolean;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    guest_user_id?: string | null;
                    token?: string;
                    posting_id?: string | null;
                    expires_at?: string;
                    is_revoked?: boolean;
                    is_masked?: boolean;
                    created_at?: string;
                };
            };
            evaluation_scores: {
                Row: {
                    id: string;
                    application_id: string | null;
                    evaluator_id: string | null;
                    scores: Json;
                    weights: Json | null;
                    weighted_average: number | null;
                    comments: string | null;
                    status: EvaluationStatus;
                    is_recused: boolean;
                    stage: EvaluationStage | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    application_id?: string | null;
                    evaluator_id?: string | null;
                    scores: Json;
                    weights?: Json | null;
                    weighted_average?: number | null;
                    comments?: string | null;
                    status?: EvaluationStatus;
                    is_recused?: boolean;
                    stage?: EvaluationStage | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    application_id?: string | null;
                    evaluator_id?: string | null;
                    scores?: Json;
                    weights?: Json | null;
                    weighted_average?: number | null;
                    comments?: string | null;
                    status?: EvaluationStatus;
                    is_recused?: boolean;
                    stage?: EvaluationStage | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            interview_schedules: {
                Row: {
                    id: string;
                    application_id: string | null;
                    scheduled_at: string;
                    duration_minutes: number;
                    meeting_link: string | null;
                    meeting_id: string | null;
                    status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
                    notes: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    application_id?: string | null;
                    scheduled_at: string;
                    duration_minutes?: number;
                    meeting_link?: string | null;
                    meeting_id?: string | null;
                    status?: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
                    notes?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    application_id?: string | null;
                    scheduled_at?: string;
                    duration_minutes?: number;
                    meeting_link?: string | null;
                    meeting_id?: string | null;
                    status?: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
                    notes?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            tests: {
                Row: {
                    id: string;
                    title: string;
                    description: string | null;
                    type: 'APTITUDE' | 'PERSONALITY';
                    time_limit: number | null;
                    status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
                    created_by: string | null;
                    is_random: boolean | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    title: string;
                    description?: string | null;
                    type?: 'APTITUDE' | 'PERSONALITY';
                    time_limit?: number | null;
                    status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
                    created_by?: string | null;
                    is_random?: boolean | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    title?: string;
                    description?: string | null;
                    type?: 'APTITUDE' | 'PERSONALITY';
                    time_limit?: number | null;
                    status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
                    created_by?: string | null;
                    is_random?: boolean | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            test_questions: {
                Row: {
                    test_id: string;
                    question_id: string;
                    order_index: number;
                };
                Insert: {
                    test_id: string;
                    question_id: string;
                    order_index: number;
                };
                Update: {
                    test_id?: string;
                    question_id?: string;
                    order_index?: number;
                };
            };
            test_norms: {
                Row: {
                    id: string;
                    test_id: string;
                    category_name: string;
                    mean_value: number;
                    std_dev_value: number;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    test_id: string;
                    category_name: string;
                    mean_value: number;
                    std_dev_value: number;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    test_id?: string;
                    category_name?: string;
                    mean_value?: number;
                    std_dev_value?: number;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            competencies: {
                Row: {
                    id: string;
                    test_id: string;
                    name: string;
                    description: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    test_id: string;
                    name: string;
                    description?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    test_id?: string;
                    name?: string;
                    description?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            competency_scales: {
                Row: {
                    competency_id: string;
                    scale_name: string;
                };
                Insert: {
                    competency_id: string;
                    scale_name: string;
                };
                Update: {
                    competency_id?: string;
                    scale_name?: string;
                };
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            get_user_role: {
                Args: Record<string, never>;
                Returns: string;
            };
        };
        Enums: {
            UserRole: UserRole;
        };
    };
}
