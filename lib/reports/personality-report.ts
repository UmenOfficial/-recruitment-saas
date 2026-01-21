import { DetailedScores, ScoringCompetency } from '../scoring';
import { PersonalityReport, ReportLevel, CompetencyReport, ScaleReport } from '../../types/report';

/**
 * Maps a T-Score to a descriptive level.
 * @param tScore The T-Score (0-100)
 */
export function getTScoreLevel(tScore: number): ReportLevel {
  if (tScore >= 70) return 'Very High';
  if (tScore >= 60) return 'High';
  if (tScore >= 40) return 'Average';
  if (tScore >= 30) return 'Low';
  return 'Very Low';
}

/**
 * Generates a basic description based on the level.
 * In a real app, this would query a content database.
 */
function generateDescription(name: string, level: ReportLevel, _type: 'competency' | 'scale' | 'total'): string {
  return `${name} is at a ${level} level.`;
}

/**
 * Generates the Deep Dive Report from the calculated detailed scores.
 * @param scores The output from calculatePersonalityScores
 * @param competencyConfig Optional configuration to map scales to competencies
 */
export function generateDeepDiveReport(
  scores: DetailedScores,
  competencyConfig?: ScoringCompetency[]
): PersonalityReport {
  // 1. Process Scales
  const scaleReports: ScaleReport[] = Object.entries(scores.scales).map(([name, data]) => {
    const level = getTScoreLevel(data.t_score);
    return {
      name,
      raw: data.raw,
      t_score: data.t_score,
      level,
      description: generateDescription(name, level, 'scale'),
    };
  });

  // Helper to find scale reports by name
  const findScaleReports = (names: string[]) =>
    scaleReports.filter(s => names.includes(s.name));

  // 2. Process Competencies
  const competencyReports: CompetencyReport[] = Object.entries(scores.competencies).map(([name, data]) => {
    const level = getTScoreLevel(data.t_score);

    // Find associated scales if config is provided
    let associatedScales: ScaleReport[] = [];
    if (competencyConfig) {
      const config = competencyConfig.find(c => c.name === name);
      if (config) {
        const scaleNames = config.competency_scales.map(s => s.scale_name);
        associatedScales = findScaleReports(scaleNames);
      }
    }

    return {
      name,
      raw: data.raw,
      t_score: data.t_score,
      level,
      description: generateDescription(name, level, 'competency'),
      scales: associatedScales
    };
  });

  // 3. Sort Competencies to find Strengths/Weaknesses
  const sortedCompetencies = [...competencyReports].sort((a, b) => b.t_score - a.t_score);

  // Top 3 Strengths
  const strengths = sortedCompetencies.slice(0, 3);

  // Bottom 3 Areas for Improvement (reverse order of score)
  // If fewer than 3, it takes what's available.
  const areas_for_improvement = [...sortedCompetencies].sort((a, b) => a.t_score - b.t_score).slice(0, 3);

  // 4. Total Summary
  const totalLevel = getTScoreLevel(scores.total.t_score);

  return {
    summary: {
      total_score: {
        raw: scores.total.raw,
        t_score: scores.total.t_score,
        level: totalLevel,
        description: generateDescription('Total Score', totalLevel, 'total')
      },
      overview_text: `The applicant has an overall ${totalLevel} score.`,
    },
    competencies: competencyReports,
    scales: scaleReports,
    strengths,
    areas_for_improvement,
    generated_at: new Date().toISOString(),
  };
}
