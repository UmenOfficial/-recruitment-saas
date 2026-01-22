import { describe, it, expect } from 'vitest';
import { mapNorms } from './norm-mapper';

describe('mapNorms', () => {
    const competencyDefs = [
        {
            name: 'Achievement',
            competency_scales: [{ scale_name: 'Drive' }, { scale_name: 'GoalSetting' }]
        },
        {
            name: 'Responsibility',
            competency_scales: [{ scale_name: 'Reliability' }]
        }
    ];

    it('should map prefixed norms correctly (Legacy behavior)', () => {
        const rawNorms = [
            { category_name: 'Scale_Drive', mean_value: 10, std_dev_value: 2 },
            { category_name: 'Comp_Achievement', mean_value: 50, std_dev_value: 10 }
        ];

        const { scaleNorms, competencyNorms } = mapNorms(rawNorms, competencyDefs);

        expect(scaleNorms).toHaveLength(1);
        expect(scaleNorms[0].category_name).toBe('Drive');
        expect(competencyNorms).toHaveLength(1);
        expect(competencyNorms[0].category_name).toBe('Achievement');
    });

    it('should map plain norms correctly (Bug fix scenario)', () => {
        const rawNorms = [
            { category_name: 'Drive', mean_value: 10, std_dev_value: 2 },
            { category_name: 'Achievement', mean_value: 50, std_dev_value: 10 },
            { category_name: 'Reliability', mean_value: 12, std_dev_value: 3 }
        ];

        const { scaleNorms, competencyNorms } = mapNorms(rawNorms, competencyDefs);

        expect(scaleNorms).toHaveLength(2);
        expect(scaleNorms.find(s => s.category_name === 'Drive')).toBeDefined();
        expect(scaleNorms.find(s => s.category_name === 'Reliability')).toBeDefined();

        expect(competencyNorms).toHaveLength(1);
        expect(competencyNorms[0].category_name).toBe('Achievement');
    });

    it('should ignore unknown categories', () => {
        const rawNorms = [
            { category_name: 'UnknownScale', mean_value: 10, std_dev_value: 2 }
        ];

        const { scaleNorms, competencyNorms } = mapNorms(rawNorms, competencyDefs);

        expect(scaleNorms).toHaveLength(0);
        expect(competencyNorms).toHaveLength(0);
    });

    it('should map TOTAL even if not in defs', () => {
         const rawNorms = [
            { category_name: 'TOTAL', mean_value: 100, std_dev_value: 15 }
        ];
        const { competencyNorms } = mapNorms(rawNorms, competencyDefs);
        expect(competencyNorms).toHaveLength(1);
        expect(competencyNorms[0].category_name).toBe('TOTAL');
    });
});
