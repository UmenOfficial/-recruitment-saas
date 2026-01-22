
import { mapNorms } from '../lib/norm-mapper';

const mockNorms = [
    { category_name: 'UnknownScale', mean_value: 50, std_dev_value: 10 }
];

// Empty competency defs -> validScaleNames will be empty
const mockCompetencies: any[] = [];

console.log('--- Reproduction Test ---');
console.log('Input Norms:', mockNorms);
console.log('Input Competencies:', mockCompetencies);

const { scaleNorms, competencyNorms } = mapNorms(mockNorms, mockCompetencies);

console.log('Result Scale Norms:', scaleNorms);
console.log('Result Competency Norms:', competencyNorms);

if (scaleNorms.length === 0) {
    console.log('FAIL: Scale norms are empty (Current Behavior)');
} else {
    console.log('SUCCESS: Scale norms preserved (Desired Behavior)');
}
