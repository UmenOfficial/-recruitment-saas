-- Create Tests table
CREATE TABLE IF NOT EXISTS tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('APTITUDE', 'PERSONALITY')),
    status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED')),
    time_limit INTEGER, -- in minutes, optional
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Test Questions table (Linking Questions to Tests with order)
CREATE TABLE IF NOT EXISTS test_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(test_id, question_id), -- Prevent duplicate question in same test
    UNIQUE(test_id, order_index)  -- Prevent duplicate order in same test (optional, but good for data integrity)
);

-- Create Test Norms table (For T-Score calculation)
-- Stores Mean and StdDev for each Category within a Test, and potentially 'TOTAL' for overall.
CREATE TABLE IF NOT EXISTS test_norms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
    category_name TEXT NOT NULL, -- e.g., '수리', '언어', or 'TOTAL'
    mean_value NUMERIC(10, 4) NOT NULL, -- Mean
    std_dev_value NUMERIC(10, 4) NOT NULL, -- Standard Deviation
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(test_id, category_name)
);

-- RLS Policies (assuming Admin only for write, everyone/authenticated for read depending on flow, 
-- but for now let's just enable RLS and give full access to service role / admin)
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_norms ENABLE ROW LEVEL SECURITY;

-- Simple policies for now (adjust as needed for specific roles)
CREATE POLICY "Enable read access for all users" ON tests FOR SELECT USING (true);
CREATE POLICY "Enable all access for service role" ON tests USING (auth.role() = 'service_role');
CREATE POLICY "Enable all access for authenticated users" ON tests USING (auth.role() = 'authenticated'); -- Temporary for Admin

CREATE POLICY "Enable read access for all users" ON test_questions FOR SELECT USING (true);
CREATE POLICY "Enable all access for service role" ON test_questions USING (auth.role() = 'service_role');
CREATE POLICY "Enable all access for authenticated users" ON test_questions USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for all users" ON test_norms FOR SELECT USING (true);
CREATE POLICY "Enable all access for service role" ON test_norms USING (auth.role() = 'service_role');
CREATE POLICY "Enable all access for authenticated users" ON test_norms USING (auth.role() = 'authenticated');
