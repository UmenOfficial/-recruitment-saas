import { PersonalityReportGenerator } from '../personality-report';
import { ScoringQuestion, ScoringNorm, ScoringCompetency } from '@/lib/scoring';

// Mock Data
const questions: ScoringQuestion[] = [
    { id: 'q1', category: 'ScaleA' },
    { id: 'q2', category: 'ScaleA' },
    { id: 'q3', category: 'ScaleB' },
];

const norms: ScoringNorm[] = [
    { category_name: 'ScaleA', mean_value: 10, std_dev_value: 2 },
    { category_name: 'ScaleB', mean_value: 5, std_dev_value: 1 },
    { category_name: 'Competency1', mean_value: 100, std_dev_value: 10 },
    { category_name: 'TOTAL', mean_value: 50, std_dev_value: 10 },
];

const competencies: ScoringCompetency[] = [
    { name: 'Competency1', competency_scales: [{ scale_name: 'ScaleA' }, { scale_name: 'ScaleB' }] }
];

describe('PersonalityReportGenerator', () => {
    it('generates a report with correct structure', () => {
        const generator = new PersonalityReportGenerator(norms, competencies, questions);

        const answers = {
            'q1': 5,
            'q2': 5, // ScaleA Raw = 10 -> T = 50 + 10*(0/2) = 50
            'q3': 5  // ScaleB Raw = 5  -> T = 50 + 10*(0/1) = 50
        };

        const report = generator.generate(answers, { attempt_number: 1 });

        // Verify Summary
        expect(report.meta.attempt_number).toBe(1);

        // Competency Raw = ScaleA T(50) + ScaleB T(50) = 100
        // Competency T = 50 + 10*((100-100)/10) = 50
        const comp1 = report.competencies.find(c => c.id === 'Competency1');
        expect(comp1).toBeDefined();
        expect(comp1?.score.raw).toBe(100);
        expect(comp1?.score.t_score).toBe(50);
        expect(comp1?.score.level).toBe('AVERAGE');

        // SubScales
        expect(comp1?.subSections).toHaveLength(2);
        const scaleA = comp1?.subSections?.find(s => s.id === 'ScaleA');
        expect(scaleA?.score.raw).toBe(10); // 5+5
        expect(scaleA?.score.t_score).toBe(50);
    });

    it('handles high scores correctly', () => {
        const generator = new PersonalityReportGenerator(norms, competencies, questions);

        const answers = {
            'q1': 6, // ScaleA Raw = 12 -> T = 50 + 10*(2/2) = 60
            'q2': 6,
            'q3': 6  // ScaleB Raw = 6 -> T = 50 + 10*(1/1) = 60
        };

        const report = generator.generate(answers, { attempt_number: 1 });

        // Competency Raw = 60 + 60 = 120
        // Competency T = 50 + 10*((120-100)/10) = 70
        const comp1 = report.competencies.find(c => c.id === 'Competency1');
        expect(comp1?.score.t_score).toBe(70);
        expect(comp1?.score.level).toBe('VERY_HIGH');
    });
});
