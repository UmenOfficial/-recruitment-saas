import { ScoringNorm } from './scoring';

interface RawNorm {
    category_name: string;
    mean_value: number | string;
    std_dev_value: number | string;
}

interface CompetencyDef {
    name: string;
    competency_scales: { scale_name: string }[];
}

/**
 * Maps raw database norms to structured ScoringNorms.
 * Handles both prefixed ('Scale_', 'Comp_') and plain category names.
 */
export function mapNorms(
    rawNorms: RawNorm[],
    competencyDefs: CompetencyDef[]
): { scaleNorms: ScoringNorm[]; competencyNorms: ScoringNorm[] } {
    const scaleMap = new Map<string, ScoringNorm>();
    const competencyMap = new Map<string, ScoringNorm>();

    // 1. Identify valid names from definitions
    const validCompetencyNames = new Set(competencyDefs.map(c => c.name));
    const validScaleNames = new Set<string>();
    competencyDefs.forEach(c => {
        c.competency_scales.forEach(s => validScaleNames.add(s.scale_name));
    });

    // 2. Sort norms to process Global norms FIRST, and Local (specific) norms LATER.
    // This allows specific local norms to override global norms when keys overlap.
    const GLOBAL_TEST_ID = '8afa34fb-6300-4c5e-bc48-bbdb74c717d8';
    const sortedNorms = [...rawNorms].sort((a, b) => {
        const aIsGlobal = (a as any).test_id === GLOBAL_TEST_ID;
        const bIsGlobal = (b as any).test_id === GLOBAL_TEST_ID;
        if (aIsGlobal && !bIsGlobal) return -1;
        if (!aIsGlobal && bIsGlobal) return 1;
        return 0;
    });

    sortedNorms.forEach(n => {
        const name = n.category_name;
        const mean = Number(n.mean_value);
        const std = Number(n.std_dev_value);

        // A. Handle Explicit Prefixes (Legacy/Strict mode)
        if (name.startsWith('Scale_')) {
            const cleanName = name.replace('Scale_', '');
            scaleMap.set(cleanName, {
                category_name: cleanName,
                mean_value: mean,
                std_dev_value: std
            });
            return;
        }

        if (name.startsWith('Comp_')) {
            const cleanName = name.replace('Comp_', '');
            competencyMap.set(cleanName, {
                category_name: cleanName,
                mean_value: mean,
                std_dev_value: std
            });
            return;
        }

        // B. Handle Plain Names (Flexible mode)
        // If the name exactly matches a known scale or competency
        if (validScaleNames.has(name)) {
            scaleMap.set(name, {
                category_name: name,
                mean_value: mean,
                std_dev_value: std
            });
            return;
        }

        if (validCompetencyNames.has(name)) {
            competencyMap.set(name, {
                category_name: name,
                mean_value: mean,
                std_dev_value: std
            });
            return;
        }

        // Also handle 'TOTAL' if not explicitly defined but present
        if (name === 'TOTAL' || name === 'Total') {
            competencyMap.set('TOTAL', {
                category_name: 'TOTAL',
                mean_value: mean,
                std_dev_value: std
            });
        }
    });

    return { 
        scaleNorms: Array.from(scaleMap.values()), 
        competencyNorms: Array.from(competencyMap.values()) 
    };
}
