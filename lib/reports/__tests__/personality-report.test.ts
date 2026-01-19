
import { describe, it, expect } from 'vitest';
import { generateDeepDiveReport, getTScoreLevel } from '../personality-report';
import { DetailedScores, ScoringCompetency } from '../../scoring';

// Mock Data
const mockDetailedScores: DetailedScores = {
    scales: {
        'Scale A': { raw: 10, t_score: 45 }, // Average
        'Scale B': { raw: 20, t_score: 75 }, // Very High
        'Scale C': { raw: 5, t_score: 25 },  // Very Low
        'Scale D': { raw: 15, t_score: 65 }, // High
    },
    competencies: {
        'Competency 1': { raw: 50, t_score: 60 }, // High
        'Competency 2': { raw: 40, t_score: 35 }, // Low
    },
    total: { raw: 90, t_score: 55 }, // Average
    raw_total: 90
};

const mockCompetencies: ScoringCompetency[] = [
    {
        name: 'Competency 1',
        competency_scales: [
            { scale_name: 'Scale A' },
            { scale_name: 'Scale B' }
        ]
    },
    {
        name: 'Competency 2',
        competency_scales: [
            { scale_name: 'Scale C' },
            { scale_name: 'Scale D' }
        ]
    }
];

describe('Personality Report Generator', () => {

    it('should correctly map T-Scores to levels', () => {
        expect(getTScoreLevel(80)).toBe('Very High');
        expect(getTScoreLevel(65)).toBe('High');
        expect(getTScoreLevel(50)).toBe('Average');
        expect(getTScoreLevel(35)).toBe('Low');
        expect(getTScoreLevel(20)).toBe('Very Low');
    });

    it('should generate a report with correct structure', () => {
        const report = generateDeepDiveReport(mockDetailedScores, mockCompetencies);

        expect(report).toHaveProperty('summary');
        expect(report).toHaveProperty('competencies');
        expect(report).toHaveProperty('scales');
        expect(report).toHaveProperty('strengths');
        expect(report).toHaveProperty('areas_for_improvement');
        expect(report.generated_at).toBeDefined();
    });

    it('should correctly categorize the total score', () => {
        const report = generateDeepDiveReport(mockDetailedScores);
        expect(report.summary.total_score.t_score).toBe(55);
        expect(report.summary.total_score.level).toBe('Average');
    });

    it('should correctly map scales to competencies when config is provided', () => {
        const report = generateDeepDiveReport(mockDetailedScores, mockCompetencies);

        const comp1 = report.competencies.find(c => c.name === 'Competency 1');
        expect(comp1).toBeDefined();
        expect(comp1?.scales).toHaveLength(2);
        expect(comp1?.scales.map(s => s.name)).toContain('Scale A');
        expect(comp1?.scales.map(s => s.name)).toContain('Scale B');
    });

    it('should handle missing competency config gracefully', () => {
        const report = generateDeepDiveReport(mockDetailedScores);
        // Should still generate competency reports but with empty scales
        expect(report.competencies).toHaveLength(2);
        expect(report.competencies[0].scales).toHaveLength(0);
    });

    it('should identify strengths (highest scores)', () => {
        const report = generateDeepDiveReport(mockDetailedScores);
        // Competency 1 (60) > Competency 2 (35)
        expect(report.strengths[0].name).toBe('Competency 1');
    });

    it('should identify areas for improvement (lowest scores)', () => {
        const report = generateDeepDiveReport(mockDetailedScores);
        // Competency 2 (35) < Competency 1 (60)
        expect(report.areas_for_improvement[0].name).toBe('Competency 2');
    });
});
