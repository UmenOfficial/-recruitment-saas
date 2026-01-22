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
    const scaleNorms: ScoringNorm[] = [];
    const competencyNorms: ScoringNorm[] = [];

    // 1. Identify valid names from definitions
    const validCompetencyNames = new Set(competencyDefs.map(c => c.name));
    const validScaleNames = new Set<string>();
    competencyDefs.forEach(c => {
        c.competency_scales.forEach(s => validScaleNames.add(s.scale_name));
    });

    rawNorms.forEach(n => {
        const name = n.category_name;
        const mean = Number(n.mean_value);
        const std = Number(n.std_dev_value);

        // A. Handle Explicit Prefixes (Legacy/Strict mode)
        if (name.startsWith('Scale_')) {
            scaleNorms.push({
                category_name: name.replace('Scale_', ''),
                mean_value: mean,
                std_dev_value: std
            });
            return;
        }

        if (name.startsWith('Comp_')) {
            competencyNorms.push({
                category_name: name.replace('Comp_', ''),
                mean_value: mean,
                std_dev_value: std
            });
            return;
        }

        // B. Handle Plain Names (Flexible mode)
        // If the name exactly matches a known scale or competency
        if (validScaleNames.has(name)) {
            scaleNorms.push({
                category_name: name,
                mean_value: mean,
                std_dev_value: std
            });
            return;
        }

        if (validCompetencyNames.has(name)) {
            competencyNorms.push({
                category_name: name,
                mean_value: mean,
                std_dev_value: std
            });
            return;
        }

        // Also handle 'TOTAL' if not explicitly defined but present
        if (name === 'TOTAL' || name === 'Total') {
            competencyNorms.push({
                category_name: 'TOTAL',
                mean_value: mean,
                std_dev_value: std
            });
        }
    });

    return { scaleNorms, competencyNorms };
}
