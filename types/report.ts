export interface ReportScore {
    raw: number;
    t_score: number;
    level?: 'VERY_LOW' | 'LOW' | 'AVERAGE' | 'HIGH' | 'VERY_HIGH';
    percentile?: number;
}

export interface ReportSection {
    id: string;
    title: string;
    score: ReportScore;
    description?: string;
    subSections?: ReportSection[];
}

export interface ReportConfig {
    levels: {
        cutoff: number;
        label: string;
        description: string;
    }[];
}

export interface DeepDiveReport {
    meta: {
        generated_at: string;
        attempt_number: number;
    };
    summary: {
        total_score: ReportScore;
        overall_level: string;
        interpretation: string;
    };
    competencies: ReportSection[];
    scales: ReportSection[]; // Flat list of scales if needed separately
}
