
import { mapNorms } from '../lib/norm-mapper';
import { calculatePersonalityScores } from '../lib/scoring';

const mockNorms = [
    { category_name: 'Comp_TOTAL', mean_value: 150, std_dev_value: 24.49 },
    { category_name: 'Comp_애국심/헌신', mean_value: 250, std_dev_value: 38.73 },
    { category_name: '객관성', mean_value: 19.41, std_dev_value: 2.92 },
    { category_name: '몰입성', mean_value: 17.9, std_dev_value: 2.51 }
];

const mockCompetencies = [
    {
        name: '애국심/헌신',
        competency_scales: [
            { scale_name: '몰입성' },
            { scale_name: '객관성' } // Just adding one more for test
        ]
    }
];

const mockQuestions = [
    { id: 'q1', category: '몰입성' },
    { id: 'q2', category: '객관성' }
];

const mockAnswers = {
    'q1': 5, // Raw score 5 for '몰입성' -> T-score check
    'q2': 5
};

console.log('--- Testing Map Norms ---');
const { scaleNorms, competencyNorms } = mapNorms(mockNorms, mockCompetencies);

console.log('Scale Norms:', scaleNorms);
console.log('Competency Norms:', competencyNorms);

console.log('\n--- Testing Scoring ---');
const scores = calculatePersonalityScores(
    mockAnswers,
    mockQuestions,
    scaleNorms,
    competencyNorms,
    mockCompetencies
);

console.log('Total T-Score:', scores.total.t_score);
console.log('Competency Scores:', scores.competencies);
console.log('Scale Scores:', scores.scales);
