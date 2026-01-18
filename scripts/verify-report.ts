
import assert from 'assert';
import { DetailedScores } from '../lib/scoring';
import { generateDeepDiveReport, getTScoreLevel } from '../lib/reports/personality-report';

// 1. Mock Data
const mockScores: DetailedScores = {
    scales: {
        'Scale A': { raw: 10, t_score: 35 },
        'Scale B': { raw: 20, t_score: 65 },
        'Scale C': { raw: 15, t_score: 50 },
    },
    competencies: {
        'Competency 1': { raw: 45, t_score: 40 }, // Average
        'Competency 2': { raw: 60, t_score: 75 }, // Very High
        'Competency 3': { raw: 30, t_score: 25 }, // Very Low
        'Competency 4': { raw: 55, t_score: 62 }, // High
    },
    total: { raw: 190, t_score: 55 }, // Average
    raw_total: 190
};

console.log('Running Verification for Personality Report Generator...');

// 2. Test getTScoreLevel
assert.strictEqual(getTScoreLevel(75), 'Very High', '75 should be Very High');
assert.strictEqual(getTScoreLevel(60), 'High', '60 should be High');
assert.strictEqual(getTScoreLevel(50), 'Average', '50 should be Average');
assert.strictEqual(getTScoreLevel(35), 'Low', '35 should be Low');
assert.strictEqual(getTScoreLevel(25), 'Very Low', '25 should be Very Low');
console.log('✅ getTScoreLevel passed.');

// 3. Test generateDeepDiveReport Structure
const report = generateDeepDiveReport(mockScores);

// Check Summary
assert.strictEqual(report.summary.total_score.t_score, 55);
assert.strictEqual(report.summary.total_score.level, 'Average');
console.log('✅ Summary section passed.');

// Check Competencies
assert.strictEqual(report.competencies.length, 4);
const comp2 = report.competencies.find(c => c.name === 'Competency 2');
assert(comp2, 'Competency 2 should exist');
assert.strictEqual(comp2?.level, 'Very High');
console.log('✅ Competencies section passed.');

// Check Strengths (Top 3)
// Expected Order: Comp 2 (75), Comp 4 (62), Comp 1 (40), Comp 3 (25)
// Strengths should be: Comp 2, Comp 4, Comp 1
assert.strictEqual(report.strengths.length, 3);
assert.strictEqual(report.strengths[0].name, 'Competency 2');
assert.strictEqual(report.strengths[1].name, 'Competency 4');
assert.strictEqual(report.strengths[2].name, 'Competency 1');
console.log('✅ Strengths logic passed.');

// Check Areas for Improvement (Bottom 3, ascending order)
// Expected: Comp 3 (25), Comp 1 (40), Comp 4 (62)
assert.strictEqual(report.areas_for_improvement.length, 3);
assert.strictEqual(report.areas_for_improvement[0].name, 'Competency 3');
assert.strictEqual(report.areas_for_improvement[1].name, 'Competency 1');
assert.strictEqual(report.areas_for_improvement[2].name, 'Competency 4');
console.log('✅ Areas for Improvement logic passed.');

console.log('🎉 All verification tests passed!');
