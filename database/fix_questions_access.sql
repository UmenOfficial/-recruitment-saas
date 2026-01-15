
-- ========================================================
-- FIX: MISSING QUESTION POLICIES (No Questions Found)
-- "등록된 문항이 없습니다" 해결 스크립트
-- ========================================================

-- 원인: Phase 1~3 보안 작업에서 questions, test_questions 테이블의 RLS(잠금)는 켰지만,
-- 정작 후보자들이 조회할 수 있는 '열쇠(Policy)'를 만들어주지 않아서 빈 목록이 반환됨.

-- 해결: "누구나(후보자 포함) 시험 문항은 볼 수 있어야 한다"는 정책 추가.

-- 1. [Tests] 시험 정보 (이미 있을 수 있지만 확실하게)
CREATE POLICY "Public view active tests" ON public.tests
FOR SELECT USING (true); 
-- (주의: 'is_active' 필터가 있다면 추가해도 좋음, 지금은 확실한 조회를 위해 true)

-- 2. [Test Questions] 시험-문항 연결 정보
CREATE POLICY "Public view test questions" ON public.test_questions
FOR SELECT USING (true);

-- 3. [Questions] 실제 문항 내용
CREATE POLICY "Public view questions" ON public.questions
FOR SELECT USING (true);

-- 4. [Competency Scales] 척도 정보 (결과 계산용 필요시)
CREATE POLICY "Public view competency scales" ON public.competency_scales
FOR SELECT USING (true);

-- 5. [Competencies] 역량 정보
CREATE POLICY "Public view competencies" ON public.competencies
FOR SELECT USING (true);


RAISE NOTICE 'Read access policies added for Tests and Questions.';
