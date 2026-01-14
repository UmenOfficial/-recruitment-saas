
export interface ScoringQuestion {
    id: string;
    category: string;
}

export interface ScoringNorm {
    category_name: string;
    mean_value: number;
    std_dev_value: number;
}

export interface ScoringCompetency {
    name: string;
    competency_scales: { scale_name: string }[];
}

export interface DetailedScores {
    scales: Record<string, { raw: number; t_score: number }>;
    competencies: Record<string, { raw: number; t_score: number }>;
    total: { raw: number; t_score: number };
    raw_total: number;
}

export function calculateTScore(raw: number, mean: number, stdDev: number): number {
    if (!stdDev || stdDev === 0) return 50;
    const t = 50 + 10 * ((raw - mean) / stdDev);
    return Math.max(0, Math.min(100, t));
}

/**
 * Centralized Personality Scoring Logic
 */
export function calculatePersonalityScores(
    answers: Record<string, string | number>,
    questions: ScoringQuestion[],
    scaleNorms: ScoringNorm[], // Separated
    competencyNorms: ScoringNorm[], // Separated
    competencies: ScoringCompetency[]
): DetailedScores {

    // 1. Calculate Scale Raw Scores
    const scaleRawScores: Record<string, number> = {};

    Object.entries(answers).forEach(([qId, val]) => {
        const question = questions.find(q => q.id === qId);
        if (!question || !question.category) return;

        const score = typeof val === 'number' ? val : parseFloat(val);
        if (isNaN(score)) return;

        scaleRawScores[question.category] = (scaleRawScores[question.category] || 0) + score;
    });

    // 2. Calculate Scale T-Scores
    const scaleFinal: Record<string, { raw: number; t_score: number }> = {};
    const scaleTMapped: Record<string, number> = {};

    Object.entries(scaleRawScores).forEach(([cat, raw]) => {
        const norm = scaleNorms.find(n => n.category_name === cat);
        const mean = norm?.mean_value || 0;
        const std = norm?.std_dev_value || 1;
        const t = calculateTScore(raw, mean, std);

        scaleFinal[cat] = { raw, t_score: t };
        scaleTMapped[cat] = t;
    });

    // 3. Calculate Competency Scores
    // Comp Raw = Sum of Scale T-Scores
    const competencyFinal: Record<string, { raw: number; t_score: number }> = {};
    let totalRaw = 0;

    competencies.forEach(comp => {
        const scaleNames = comp.competency_scales.map(s => s.scale_name);
        let cRaw = 0;
        scaleNames.forEach(name => {
            cRaw += (scaleTMapped[name] || 0);
        });

        // Comp T-Score: Use Competency Norms
        const norm = competencyNorms.find(n => n.category_name === comp.name);
        const mean = norm?.mean_value || 0;
        const std = norm?.std_dev_value || 1;
        const cT = calculateTScore(cRaw, mean, std);

        competencyFinal[comp.name] = { raw: cRaw, t_score: cT };
        totalRaw += cT;
    });

    // 4. Calculate Total Score
    // Total Norm is typically in Competency Norms or a separate list. 
    // We'll check competencyNorms first, or user should pass it there.
    const totalNorm = competencyNorms.find(n => n.category_name === 'TOTAL')
        || scaleNorms.find(n => n.category_name === 'TOTAL');

    const totalMean = totalNorm?.mean_value || 0;
    const totalStd = totalNorm?.std_dev_value || 1;
    const totalT = calculateTScore(totalRaw, totalMean, totalStd);

    return {
        scales: scaleFinal,
        competencies: competencyFinal,
        total: { raw: totalRaw, t_score: totalT },
        raw_total: totalRaw
    };
}
