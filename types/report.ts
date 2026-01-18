export type ReportLevel = 'Very Low' | 'Low' | 'Average' | 'High' | 'Very High';

export interface ScoreDetail {
  raw: number;
  t_score: number;
  level: ReportLevel;
  description?: string;
}

export interface ScaleReport extends ScoreDetail {
  name: string;
}

export interface CompetencyReport extends ScoreDetail {
  name: string;
  scales: ScaleReport[]; // Scales belonging to this competency
}

export interface PersonalityReport {
  summary: {
    total_score: ScoreDetail;
    overview_text: string;
  };
  competencies: CompetencyReport[];
  scales: ScaleReport[]; // Flat list of all scales for easy access
  strengths: CompetencyReport[]; // Top scoring competencies
  areas_for_improvement: CompetencyReport[]; // Lowest scoring competencies
  generated_at: string; // ISO Date
}
