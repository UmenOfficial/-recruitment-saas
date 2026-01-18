# Implementation Plan - Personality Report Generator

## Goal
Implement `lib/reports/personality-report.ts` to generate 'Deep Dive Reports' based on `DetailedScores` from `lib/scoring.ts`, without modifying the scoring logic.

## Steps

1.  **Define Types (`types/report.ts`)**
    - Define `PersonalityReport`, `ReportLevel`, `CompetencyReport`, `ScaleReport`.
    - This ensures type safety across the application.

2.  **Implement Logic (`lib/reports/personality-report.ts`)**
    - Import `DetailedScores` from `lib/scoring.ts`.
    - Implement `generateDeepDiveReport(scores: DetailedScores): PersonalityReport`.
    - **Logic Details**:
        - **Level Mapping**:
            - 70+ : Very High
            - 60-69: High
            - 40-59: Average
            - 30-39: Low
            - <30 : Very Low
        - **Sorting**: Identify top 3 and bottom 3 competencies.
        - **Content**: Generate simple descriptive strings based on levels (as no content DB exists yet).

3.  **Verification (`scripts/verify-report.ts`)**
    - Create a standalone script to verify the logic.
    - Mock `DetailedScores` input.
    - Assert output structure and correctness of level mapping.
    - Execution: `npx tsx scripts/verify-report.ts` (if available) or via `tsc`.

## Constraints
- **Do NOT modify `lib/scoring.ts`**.
- Use existing `DetailedScores` structure.
