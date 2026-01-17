
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const GLOBAL_TEST_ID = '8afa34fb-6300-4c5e-bc48-bbdb74c717d8';

// Configuration based on User Request
interface NormConfig {
    name: string;
    mean: number;
    std: number;
}

// Helper to generate slightly random values within range for natural variation
// Seeded logic or just predefined for consistency usually better. 
// I will define them explicitly to "Estimated based on definition".

const SCALES_GENERAL: NormConfig[] = [
    { name: '개방성', mean: 18.5, std: 2.8 }, // Openness: generally high
    { name: '개선성', mean: 18.2, std: 2.7 },
    { name: '객관성', mean: 17.8, std: 2.6 }, // Harder to be objective
    { name: '거시성', mean: 17.5, std: 2.9 },
    { name: '겸손성', mean: 18.0, std: 2.5 },
    { name: '경쟁성', mean: 17.9, std: 3.0 }, // High variance
    { name: '계획성', mean: 18.4, std: 2.6 },
    { name: '공감성', mean: 18.8, std: 2.7 }, // Socially desirable
    { name: '관계성', mean: 18.6, std: 2.8 },
    { name: '긍정성', mean: 19.0, std: 2.9 }, // High mean mostly
    { name: '도전성', mean: 18.3, std: 3.1 },
    { name: '몰입성', mean: 18.1, std: 2.8 },
    { name: '민감성', mean: 17.6, std: 3.0 },
    { name: '분석성', mean: 17.9, std: 2.6 },
    { name: '비판성', mean: 17.2, std: 2.9 }, // Critical thinking
    { name: '설득성', mean: 18.0, std: 2.8 },
    { name: '세밀성', mean: 18.3, std: 2.7 },
    { name: '수용성', mean: 18.7, std: 2.6 },
    { name: '신중성', mean: 18.2, std: 2.6 },
    { name: '실행성', mean: 18.5, std: 2.9 },
    { name: '윤리성', mean: 19.2, std: 2.5 }, // Highly desirable
    { name: '인내성', mean: 18.4, std: 2.8 },
    { name: '일관성', mean: 18.3, std: 2.7 },
    { name: '자발성', mean: 18.6, std: 2.9 },
    { name: '적응성', mean: 18.5, std: 2.7 },
    { name: '전문성', mean: 17.8, std: 3.0 }, // Depends on experience
    { name: '주도성', mean: 18.4, std: 3.1 },
    { name: '준수성', mean: 18.9, std: 2.6 }, // Compliance
    { name: '창의성', mean: 17.7, std: 3.2 }, // Harder
    { name: '책임성', mean: 19.1, std: 2.5 }, // Desirable
    { name: '헌신성', mean: 18.8, std: 2.7 },
    { name: '협동성', mean: 19.0, std: 2.6 },
    { name: '회복성', mean: 18.3, std: 2.9 },
    { name: '거짓말', mean: 17.5, std: 3.0 }, // Reliability Scale (High score maybe means Lie?)
    // Note: Reliability scales might have different raw score logic. 
    // Assuming typical Likert 1-5 * items.
    { name: '지시불이행', mean: 17.2, std: 3.1 },
    { name: '자기신뢰도검증', mean: 18.0, std: 2.8 },
];

const SCALES_CLINICAL: NormConfig[] = [
    { name: '불안/우울장애', mean: 10.5, std: 2.4 }, // Low mean expected
    { name: '공격성', mean: 9.8, std: 2.3 },
    { name: '조현형 성격장애', mean: 9.2, std: 2.1 },
    { name: '반사회적 성격장애', mean: 8.8, std: 2.0 }, // Very low
    { name: '경계선 성격장애', mean: 9.5, std: 2.2 },
    { name: '의존성 성격장애', mean: 10.2, std: 2.3 },
    { name: '편집성 성격장애', mean: 9.7, std: 2.2 },
];

async function main() {
    console.log(`Updating ${SCALES_GENERAL.length + SCALES_CLINICAL.length} Global Scale Norms...`);

    const allScales = [...SCALES_GENERAL, ...SCALES_CLINICAL];
    const normsToUpsert: any[] = [];

    // NOTE: '거짓말', '지시불이행' might be stored without 'Scale_' prefix if setup wrong?
    // Check previous logs. 'Scale_거짓말' existed.
    // I will use 'Scale_' prefix for all.

    allScales.forEach(cfg => {
        normsToUpsert.push({
            test_id: GLOBAL_TEST_ID,
            category_name: `Scale_${cfg.name}`,
            mean_value: cfg.mean,
            std_dev_value: cfg.std
        });
    });

    const { error } = await supabase
        .from('test_norms')
        .upsert(normsToUpsert, { onConflict: 'test_id, category_name' });

    if (error) {
        console.error('Error updating global norms:', error);
    } else {
        console.log(`Successfully updated/upserted ${normsToUpsert.length} global norms.`);

        // Validation Output
        console.log('\n--- Applied Norms (Sample) ---');
        console.log(normsToUpsert.slice(0, 3));
        console.log(normsToUpsert.slice(-3));
    }
}

main();
