# Personality Scoring & Norms Architecture
> **⚠️ CRITICAL SYSTEM DOCUMENTATION**
> This document defines the core logic for the Umen Recruitment SaaS Personality Test.
> **Any changes to the logic described below must be statistically validated.**

## 1. Core Architecture: Two-Layer Norm System

The scoring system strictly distinguishes between **Global Scales** and **Local Competencies**.

### A. Scale Norms (Global)
*   **Definition**: The foundational 43 personality traits (e.g., Openness, Responsibility).
*   **Scope**: **GLOBAL**. Shared across ALL personality tests (Standard, NIS, etc.).
*   **Storage**: Stored under a specific Global Test ID (e.g., `8afa34fb...`).
*   **Values**:
    *   **Mean**: Typically **18.0 ~ 19.5**.
    *   **StdDev**: Wide distribution (**2.5 ~ 3.2**) to prevent score saturation.
*   **Implication**: If you update the scale norms for one test, **ALL** tests are affected.

### B. Competency Norms (Local)
*   **Definition**: High-level constructs (e.g., "Innovation", "Patriotism") composed of multiple scales.
*   **Scope**: **LOCAL**. Specific to each Test ID (Standard, NIS Custom).
*   **Storage**: Stored under the specific Test ID.
*   **Calculation Base**: Sum of **Scale T-Scores** (NOT Raw Scores).
*   **Values**:
    *   **Mean**: Fixed at **250** (assuming 5 scales * 50T).
    *   **StdDev (Distinct)**: VARIES by competency based on internal correlation ($\rho$).
        *   High Correlation (Cohesive): Higher SD (~40-42).
        *   Low Correlation (Diverse): Lower SD (~36-37).
        *   **Standard Deviation Formula**: $SD_{composite} = \sqrt{k \cdot 10^2 + k(k-1) \cdot \rho \cdot 10^2}$

## 2. Calculation Logic (Step-by-Step)
The `calculatePersonalityScores` function follows this strict pipeline:

1.  **Scale Raw**: Sum of user answers (1-5) for each scale.
    *   *Note: Reverse scoring is applied before this step.*
2.  **Scale T-Score**: Convert Raw to T-Score using **Global Scale Norms**.
3.  **Competency Raw**: Sum of **Scale T-Scores** belonging to the competency.
4.  **Competency T-Score**: Convert Comp Raw to T-Score using **Local Competency Norms**.
5.  **Total Raw**: Sum of **Competency T-Scores**.
6.  **Total T-Score**: Convert Total Raw to T-Score using **Local 'TOTAL' Norm**.

## 3. Maintenance Procedures

### Updating Norms
1.  **Global Scales**: Update ONLY when a significant new population dataset (>1,000) is available. Use the **Standard Personality Test** data as the source.
2.  **Local Competencies**: Can be updated per test. However, always calculate SD based on the **actual correlation** of the scales within that competency for that specific client/test.

### Admin Panel
*   **Scales Tab**: Updates here affect the **Global** norms. Use with caution.
*   **Competencies Tab**: Updates here affect only the **Current** test.

## 4. Troubleshooting
*   **Score Inflation (100 points)**: Caused by SD being too small (~1.0). Ensure Scale SD > 2.0 and Competency SD > 20.0.
*   **Admin Page Discrepancy**: Ensure `test_results` table has both `total_score` and `t_score` columns updated.

---
**Last Updated**: 2026-01-15
**Owner**: Development Team / Antigravity Agent
