-- =====================================================
-- Recruitment SaaS Database Schema
-- PIPA Compliant (Korea Personal Information Protection Act)
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. Users Table (Admin, Guest, Candidate)
-- =====================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  encrypted_password VARCHAR(255), -- NULL for OAuth users
  role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'GUEST', 'CANDIDATE')),
  full_name VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- =====================================================
-- 2. Job Postings Table
-- =====================================================
CREATE TABLE postings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  site_config JSONB, -- Stores layout type, colors, images, custom fields
  -- Example site_config structure:
  -- {
  --   "layout": "TYPE_A",
  --   "primaryColor": "#3B82F6",
  --   "bannerImage": "https://...",
  --   "customFields": [
  --     {"type": "essay", "label": "Why do you want to join?", "required": true},
  --     {"type": "url", "label": "Portfolio URL", "required": false}
  --   ]
  -- }
  is_active BOOLEAN DEFAULT TRUE,
  deadline TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_postings_active ON postings(is_active);
CREATE INDEX idx_postings_deadline ON postings(deadline);

-- =====================================================
-- 3. Questions Bank Table
-- =====================================================
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content TEXT NOT NULL,
  image_url VARCHAR(500), -- Optional image for the question
  options JSONB NOT NULL, -- Array of options: ["Option A", "Option B", "Option C", "Option D"]
  correct_answer INTEGER NOT NULL, -- Index of correct option (0-based)
  score INTEGER DEFAULT 1, -- Points for this question
  category VARCHAR(100), -- e.g., "Technical", "Logical Reasoning"
  difficulty VARCHAR(20) CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_questions_category ON questions(category);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);

-- =====================================================
-- 4. Applications Table
-- =====================================================
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  posting_id UUID REFERENCES postings(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'APPLIED' 
    CHECK (status IN ('APPLIED', 'TEST_PENDING', 'TEST_COMPLETED', 'INTERVIEW', 'PASS', 'FAIL')),
  
  -- PII Data (ENCRYPTED) - Store as TEXT after AES-256 encryption
  pii_phone_encrypted TEXT, -- Encrypted phone number
  pii_address_encrypted TEXT, -- Encrypted home address
  pii_resident_id_encrypted TEXT, -- Encrypted resident registration number
  pii_email_encrypted TEXT, -- Encrypted email address (separate from user auth)

  -- Personal Info (Plain Text / Non-sensitive)
  name VARCHAR(100),
  dob DATE,
  gender VARCHAR(10), -- 'Male', 'Female'
  photo_url VARCHAR(500),
  
  -- Non-sensitive data
  resume_url VARCHAR(500),
  portfolio_url VARCHAR(500),
  custom_answers JSONB, -- Answers to custom fields from site_config
  
  -- Extended Application Data (Sections 2-9)
  application_data JSONB DEFAULT '{}'::jsonb,
  
  -- Consent & Retention
  data_retention_days INTEGER DEFAULT 180, -- PIPA compliance: default 6 months
  consent_given_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Blind Mode Flag
  blind_mode_enabled BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_applications_user ON applications(user_id);
CREATE INDEX idx_applications_posting ON applications(posting_id);
CREATE INDEX idx_applications_status ON applications(status);

-- =====================================================
-- 5. Test Results Table
-- =====================================================
CREATE TABLE test_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  
  -- Test Session Info
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  time_limit_minutes INTEGER, -- Server-side validation
  
  -- Scoring
  total_score INTEGER DEFAULT 0,
  max_score INTEGER,
  
  -- Answer Log
  answers_log JSONB, -- Array of {question_id, selected_option, is_correct, time_spent}
  
  -- Anti-Cheating
  violation_count INTEGER DEFAULT 0,
  violation_log JSONB, -- Array of {timestamp, type: "window_blur" | "visibility_change"}
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_test_results_application ON test_results(application_id);

-- =====================================================
-- 6. Audit Logs Table (PIPA Compliance - Immutable)
-- =====================================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES users(id), -- Who performed the action
  target_application_id UUID REFERENCES applications(id), -- Which application was accessed
  action VARCHAR(50) NOT NULL, -- 'VIEW_PROFILE', 'DOWNLOAD_RESUME', 'VIEW_PII', 'UPDATE_STATUS'
  ip_address VARCHAR(45), -- IPv4 or IPv6
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prevent updates/deletes on audit logs (immutable)
CREATE RULE audit_logs_no_update AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
CREATE RULE audit_logs_no_delete AS ON DELETE TO audit_logs DO INSTEAD NOTHING;

CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_target ON audit_logs(target_application_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);

-- =====================================================
-- 7. Guest Access Tokens (Temporary Access for Clients)
-- =====================================================
CREATE TABLE guest_access_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guest_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  posting_id UUID REFERENCES postings(id), -- Scope: which posting they can access
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_guest_tokens_token ON guest_access_tokens(token);
CREATE INDEX idx_guest_tokens_expires ON guest_access_tokens(expires_at);

-- =====================================================
-- 8. Evaluation Scores (Guest Evaluator Scores)
-- =====================================================
CREATE TABLE evaluation_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  evaluator_id UUID REFERENCES users(id), -- Guest or Admin
  
  -- Dynamic Scorecard
  scores JSONB NOT NULL, -- {"job_fit": 85, "culture_fit": 90, "technical": 75}
  weights JSONB, -- {"job_fit": 40, "culture_fit": 60} (percentage)
  weighted_average DECIMAL(5,2), -- Auto-calculated
  
  comments TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_evaluation_application ON evaluation_scores(application_id);
CREATE INDEX idx_evaluation_evaluator ON evaluation_scores(evaluator_id);

-- =====================================================
-- 9. Interview Schedules (Google Meet Integration)
-- =====================================================
CREATE TABLE interview_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  meeting_link VARCHAR(500), -- Google Meet link
  meeting_id VARCHAR(255), -- Google Calendar Event ID
  status VARCHAR(20) DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'COMPLETED', 'CANCELLED')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_interview_application ON interview_schedules(application_id);
CREATE INDEX idx_interview_scheduled_at ON interview_schedules(scheduled_at);

-- =====================================================
-- Triggers for updated_at timestamps
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_postings_updated_at BEFORE UPDATE ON postings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evaluation_scores_updated_at BEFORE UPDATE ON evaluation_scores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interview_schedules_updated_at BEFORE UPDATE ON interview_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Sample Data (Optional - for development)
-- =====================================================

-- Insert Admin User
INSERT INTO users (email, role, full_name) VALUES
  ('admin@recruitment-saas.com', 'ADMIN', 'System Administrator');

-- Insert Sample Posting
INSERT INTO postings (title, description, site_config, created_by) VALUES
  (
    'Senior Software Engineer',
    'We are looking for an experienced software engineer...',
    '{"layout": "TYPE_A", "primaryColor": "#3B82F6", "customFields": [{"type": "essay", "label": "Why do you want to join our team?", "required": true}]}',
    (SELECT id FROM users WHERE email = 'admin@recruitment-saas.com')
  );
