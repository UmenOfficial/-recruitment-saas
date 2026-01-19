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
 * @param competencies Optional configuration to map scales to competencies.
 */
export function generateDeepDiveReport(
  scores: DetailedScores,
  competencies?: ScoringCompetency[]
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

  // 2. Process Competencies
  const competencyReports: CompetencyReport[] = Object.entries(scores.competencies).map(([name, data]) => {
    const level = getTScoreLevel(data.t_score);

    // Find scales for this competency if config is provided
    let competencyScales: ScaleReport[] = [];
    if (competencies) {
      const compConfig = competencies.find(c => c.name === name);
      if (compConfig) {
        // Map the scale names in the config to the generated scale reports
        competencyScales = compConfig.competency_scales
          .map(cs => scaleReports.find(sr => sr.name === cs.scale_name))
          .filter((sr): sr is ScaleReport => !!sr);
      }
    }

    return {
      name,
      raw: data.raw,
      t_score: data.t_score,
      level,
      description: generateDescription(name, level, 'competency'),
      scales: competencyScales
    };
  });

  // 3. Sort Competencies to find Strengths/Weaknesses
  // Sort descending by T-Score
  const sortedByScore = [...competencyReports].sort((a, b) => b.t_score - a.t_score);

  // Top 3 Strengths
  const strengths = sortedByScore.slice(0, 3);

  // Bottom 3 Areas for Improvement (lowest scores)
  // We sort ascending for this
  const areas_for_improvement = [...competencyReports]
    .sort((a, b) => a.t_score - b.t_score)
    .slice(0, 3);

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
    scales: scaleReports, // Flat list
    strengths,
    areas_for_improvement,
    generated_at: new Date().toISOString(),
  };
}
