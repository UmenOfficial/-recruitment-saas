# Recruitment SaaS Platform

본 프로젝트는 **슈퍼 관리자(컨설턴트), 기업 담당자(HR), 외부 평가자, 지원자** 4가지 계층이 상호작용하는 **채용 평가 플랫폼(SaaS)**입니다. Next.js 16 (App Router)와 Supabase를 기반으로 구축되었으며, 공정성(블라인드 평가)과 안정성(온라인 시험 Fail-Safe)을 최우선으로 합니다.

---

## 🚀 개발 완료된 주요 기능 (Implemented Features)

### 1. 랜딩 페이지 및 공통 기능 (Homepage & Common)
*   **Hero Section & UX**: 모던하고 동적인 디자인(Glassmorphism, Animations) 적용.
*   **Waitlist (Pre-registration)**: 이메일 사전 등록 시스템, Supabase 연동 및 실시간 카운트 표시 (KST 기준).
*   **U-Talk Lounge**: 예비 지원자들을 위한 커뮤니티 섹션.
*   **Visitor Tracking**: 비로그인 방문자 세션 추적 및 `audit_logs` 기록 시스템.
*   **U-Class (Content Platform)**:
    *   채용/취업 관련 아티클 및 비디오 콘텐츠 제공.
    *   **CMS (Admin)**: 관리자용 콘텐츠 생성, 수정(`WYSIWYG Editor`), 삭제, 공개/비공개 처리 기능.
    *   상세 페이지 뷰 및 관련 콘텐츠 추천.

### 2. 관리자 대시보드 (Admin Dashboard)
*   **Overview Stats**: 총 지원자, 진행 중인 공고, 문제 문항 수(적성/인성) 등 핵심 지표 실시간 확인.
*   **Visitor Analytics**: 일별 방문자 수 차트(`Recharts`) 및 누적 방문 통계.
*   **Quick Actions**: 문제 관리, 지원자 평가 등 주요 기능 바로가기.

### 3. 문제은행 및 시험 관리 (Test Management)
*   **Question Bank**:
    *   **Aptitude (적성)**: 언어, 수리, 추리 등 유형별 문제 관리.
    *   **Personality (인성)**: Big 5 이론 기반 성격 유형 검사 문항 관리 (역채점 지원).
*   **Excel Bulk Upload**:
    *   대량의 문항을 엑셀로 일괄 업로드.
    *   **Replace Mode**: 기존 문항을 유지하거나 전체 교체하는 옵션 지원.
    *   업로드 시 데이터 유효성 검증(Validation).

### 4. 지원자 경험 (Candidate Experience)
*   **Application Flow**: 채용 공고 확인 -> 지원서 작성 -> 전형 진행.
*   **Online Assessment (온라인 시험)**:
    *   **Environment Check**: 응시 전 가이드 및 연습 문제 풀이.
    *   **Reliability**: 서버 시간 동기화 타이머, 자동 저장(Auto-Save), 네트워크 불안정 감지.
    *   **Mobile Optimized**: 모바일 환경에서도 원활한 응시가 가능한 적응형 UI.
*   **My Report**:
    *   **Deep Dive Report**: 인성검사 결과에 따른 역량(Competency) 상세 분석 리포트 제공.
    *   **Norms Engine**: 글로벌/로컬 규준(Norms)에 기반한 T-Score 산출 로직 적용.
    *   **Aptitude Deep Dive (적성검사 리포트)**:
        *   **Absolute Scoring**: 100점 만점 기준의 절대평가 점수 산출 및 문항별 정오답(Correct/Wrong) 상세 분석.
        *   **Interactive Review**: 문항별 해설(Explanation) 및 전체 정답률(Global Correct Rate) 통계 제공.
        *   **Wrong Answer Note (Beta)**: 오답 문항 집중 복습을 위한 오답노트 기능 연동 예정.

### 5. 시스템 및 보안 (System & Security)
*   **Authentication**: Supabase Auth 연동 (Email/Password, OAuth).
*   **RBAC (Role Based Access Control)**: 사용자 역할(Super Admin, Corp Admin, User)에 따른 엄격한 페이지/데이터 접근 제어.
*   **Audit Logging**: 주요 액션(로그인, 평가, 데이터 조회, 방문)에 대한 감사 로그 자동 기록.
*   **System Reliability**: 에러 핸들링 및 Toast 알림 시스템(`sonner`).

---

## 🛠 기술 스택 (Tech Stack)

### Core Framework
*   **Framework**: Next.js 16 (App Router)
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS v4
*   **UI Components**: Lucide React, Custom UI Components
*   **Charts**: Recharts

### Backend & Database
*   **Database**: PostgreSQL (via Supabase)
*   **Auth**: Supabase Auth
*   **Storage**: Supabase Storage (이미지, 썸네일)
*   **ORM/Query**: Supabase JS Client

### Development Tools
*   **Package Manager**: NPM
*   **Editor**: VS Code (Recommended)
*   **State Management**: React Hooks (useState, useEffect, useContext)

---

## ⚙️ 환경 변수 설정 (Environment Setup)

프로젝트 실행을 위해 루트 디렉토리에 `.env.local` 파일을 생성하고 아래 변수들을 설정해야 합니다.

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Service Options
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Security (Important)
# 미들웨어 우회를 방지하기 위한 관리자 비밀 키입니다.
ADMIN_SECRET_KEY=your_secure_random_string_here
```

---

## 📂 프로젝트 구조 (Project Structure)

```
/
├── app/                    # Next.js App Router root
│   ├── admin/             # 관리자 전용 페이지 (Dashboard, Contents, Tests...)
│   ├── api/               # API Route Handlers (Server-side logic)
│   ├── candidate/         # 지원자 전용 페이지 (My Page, Test Taking...)
│   ├── login/             # 인증 페이지
│   └── u-class/           # U-Class 콘텐츠 페이지
├── components/             # 재사용 가능한 UI 컴포넌트
│   ├── admin/             # 관리자용 컴포넌트 (ExcelUpload, Sidebar...)
│   ├── common/            # 공통 컴포넌트 (Button, Modal, Logo...)
│   └── layout/            # 레이아웃 컴포넌트 (Header, Footer...)
├── lib/                    # 유틸리티 및 라이브러리 설정
│   └── supabase/          # Supabase Client 설정 (global-client, server)
├── scripts/                # 유지보수 및 데이터 마이그레이션 스크립트
├── types/                  # TypeScript 타입 정의
└── database/               # SQL 스키마 및 마이그레이션 파일
```

---

## 📝 라이선스 및 저작권
Copyright © 2025 U.men. All rights reserved.

## 🧠 Personality Scoring System (CRITICAL)

The personality test scoring logic follows a strict **Two-Layer Norm Architecture** (Global Scales / Local Competencies).
This logic is statistically sensitive and **MUST NOT be modified** without understanding the core principles.

👉 **[Read the Full Documentation (docs/NORMS_AND_SCORING.md)](./docs/NORMS_AND_SCORING.md)**

**Key Rules:**
1. **Global Scale Norms** are shared across ALL tests.
2. **Competency Norms** are distinct per test and use specific Standard Deviations based on scale correlations.
3. Scoring Logic implementation is protected in `lib/scoring.ts`.
