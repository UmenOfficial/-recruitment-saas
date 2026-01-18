import { DetailedScores } from '../scoring';
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
function generateDescription(name: string, level: ReportLevel, type: 'competency' | 'scale' | 'total'): string {
  return `${name} is at a ${level} level.`;
}

/**
 * Generates the Deep Dive Report from the calculated detailed scores.
 * @param scores The output from calculatePersonalityScores
 */
export function generateDeepDiveReport(scores: DetailedScores): PersonalityReport {
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
  // Note: We need to know which scales belong to which competency.
  // The DetailedScores object structure for competencies is just a record of scores.
  // It doesn't inherently link back to the scales structure *inside* the score object,
  // but existing logic in lib/scoring.ts uses `ScoringCompetency` config to do the math.
  // Since we don't have the config passed in here, we might miss the hierarchy link (Competency -> Scales).
  // However, looking at `DetailedScores` interface in `lib/scoring.ts`:
  // It just has `scales` and `competencies` as separate records.
  // Requirement: "Deep Dive Report" usually implies showing the hierarchy.
  // Since I cannot change `lib/scoring.ts`, I'll check if I can infer or if I should just list them.
  // Without the `ScoringCompetency` definition passed here, I can't reconstruct the tree perfectly.
  // For now, I will return `scales` as an empty array in `CompetencyReport` or
  // I will accept `competencyConfig` as an optional argument if needed later.
  // BUT, the prompt said "receive applicant score data".
  // Let's stick to what we have. I will leave `scales` empty in CompetencyReport for now
  // OR I'll assume a flat structure is sufficient for the "Report" object
  // and the UI will handle mapping if it has the config.
  // actually, let's look at `types/report.ts` again. I defined `scales: ScaleReport[]` inside `CompetencyReport`.
  // I will populate it if I can match names, but I don't have the mapping here.
  // I will leave it empty for this iteration to avoid inventing mappings.

  const competencyReports: CompetencyReport[] = Object.entries(scores.competencies).map(([name, data]) => {
    const level = getTScoreLevel(data.t_score);
    return {
      name,
      raw: data.raw,
      t_score: data.t_score,
      level,
      description: generateDescription(name, level, 'competency'),
      scales: [] // Cannot populate without config
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
