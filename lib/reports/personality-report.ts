import {
    calculatePersonalityScores,
    ScoringQuestion,
    ScoringNorm,
    ScoringCompetency,
    DetailedScores
} from '@/lib/scoring';
import { DeepDiveReport, ReportScore, ReportSection } from '@/types/report';

export class PersonalityReportGenerator {
    private norms: ScoringNorm[];
    private competencies: ScoringCompetency[];
    private questions: ScoringQuestion[];

    constructor(
        norms: ScoringNorm[],
        competencies: ScoringCompetency[],
        questions: ScoringQuestion[]
    ) {
        this.norms = norms;
        this.competencies = competencies;
        this.questions = questions;
    }

    public generate(
        answers: Record<string, string | number>,
        meta: { attempt_number: number }
    ): DeepDiveReport {
        // Separate norms into Scale and Competency norms as required by Two-Layer architecture
        // Assuming 'competencies' list defines which categories are competencies.
        // Everything else in norms (except TOTAL) is likely a scale norm?
        // Actually, lib/scoring.ts expects explicit lists.
        // We can split norms based on whether they match a competency name or 'TOTAL'.

        const competencyNames = new Set(this.competencies.map(c => c.name));
        competencyNames.add('TOTAL');

        const competencyNorms = this.norms.filter(n => competencyNames.has(n.category_name));
        const scaleNorms = this.norms.filter(n => !competencyNames.has(n.category_name));

        const scores: DetailedScores = calculatePersonalityScores(
            answers,
            this.questions,
            scaleNorms,
            competencyNorms,
            this.competencies
        );

        return {
            meta: {
                generated_at: new Date().toISOString(),
                attempt_number: meta.attempt_number
            },
            summary: this.buildSummary(scores.total),
            competencies: this.buildCompetencies(scores),
            scales: this.buildScales(scores)
        };
    }

    private getLevel(tScore: number): 'VERY_LOW' | 'LOW' | 'AVERAGE' | 'HIGH' | 'VERY_HIGH' {
        if (tScore >= 70) return 'VERY_HIGH';
        if (tScore >= 60) return 'HIGH';
        if (tScore >= 40) return 'AVERAGE';
        if (tScore >= 30) return 'LOW';
        return 'VERY_LOW';
    }

    private buildSummary(total: { raw: number; t_score: number }) {
        const level = this.getLevel(total.t_score);
        return {
            total_score: {
                raw: total.raw,
                t_score: total.t_score,
                level
            },
            overall_level: level,
            interpretation: this.getInterpretation(level)
        };
    }

    private buildCompetencies(scores: DetailedScores): ReportSection[] {
        return this.competencies.map(comp => {
            const s = scores.competencies[comp.name] || { raw: 0, t_score: 50 };

            // Find sub-scales
            const subScales = comp.competency_scales.map(scaleRef => {
                const scaleName = scaleRef.scale_name;
                const scaleScore = scores.scales[scaleName] || { raw: 0, t_score: 50 };
                return {
                    id: scaleName,
                    title: scaleName,
                    score: {
                        raw: scaleScore.raw,
                        t_score: scaleScore.t_score,
                        level: this.getLevel(scaleScore.t_score)
                    }
                };
            });

            return {
                id: comp.name,
                title: comp.name,
                score: {
                    raw: s.raw,
                    t_score: s.t_score,
                    level: this.getLevel(s.t_score)
                },
                subSections: subScales
            };
        });
    }

    private buildScales(scores: DetailedScores): ReportSection[] {
        return Object.entries(scores.scales).map(([name, s]) => ({
            id: name,
            title: name,
            score: {
                raw: s.raw,
                t_score: s.t_score,
                level: this.getLevel(s.t_score)
            }
        }));
    }

    private getInterpretation(level: string): string {
        switch (level) {
            case 'VERY_HIGH': return '조직 적합도가 매우 높습니다. 탁월한 역량을 발휘할 가능성이 큽니다.';
            case 'HIGH': return '조직 적합도가 높습니다. 안정적인 성과가 기대됩니다.';
            case 'AVERAGE': return '조직 적합도가 보통 수준입니다. 일반적인 직무 수행에 무리가 없습니다.';
            case 'LOW': return '조직 적합도가 다소 낮습니다. 적응에 노력이 필요할 수 있습니다.';
            case 'VERY_LOW': return '조직 적합도가 낮습니다. 면밀한 검토가 필요합니다.';
            default: return '판단 불가';
        }
    }
}
