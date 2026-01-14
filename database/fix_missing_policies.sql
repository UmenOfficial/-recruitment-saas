
-- ========================================================
-- SUPABASE SECURITY ADVISOR FIX SCRIPT (PHASE 4 - INFO)
-- "RLS Enabled No Policy" (잠김 상태)인 테이블에 
-- 적절한 열쇠(Policy)를 만들어주는 스크립트입니다.
-- ========================================================

-- 1. [Users] 유저 본인 확인용
CREATE POLICY "Users can view own profile" ON public.users
FOR SELECT USING (auth.uid() = id);

-- 2. [Postings] 채용 공고는 누구나 볼 수 있어야 함 (공개)
CREATE POLICY "Public view active postings" ON public.postings
FOR SELECT USING (is_active = true);

-- 3. [Competencies] 진단 역량/척도 정보 (관리자 및 결과 조회용)
-- 일단 관리자에게만 권한 부여 (점수 산출은 서버에서 하므로 안전)
CREATE POLICY "Admin manage competencies" ON public.competencies
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN', 'CORPORATE_ADMIN'))
);

CREATE POLICY "Admin manage scales" ON public.competency_scales
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN', 'CORPORATE_ADMIN'))
);

-- 4. [Audit Logs] 감사 로그 (관리자 전용)
CREATE POLICY "Admin view audit logs" ON public.audit_logs
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN'))
);

-- 5. [Norm Versions] 규준 관리 (관리자 전용)
CREATE POLICY "Admin manage norm versions" ON public.test_norm_versions
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN'))
);

-- 6. [Interview Schedules] 면접 일정 (관리자 관리)
CREATE POLICY "Admin manage schedules" ON public.interview_schedules
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN', 'CORPORATE_ADMIN'))
);

-- 7. [Postings] 관리자 관리 권한 추가
CREATE POLICY "Admin manage postings" ON public.postings
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN', 'CORPORATE_ADMIN'))
);
