const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Env variables are missing.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// --- Scoring Logic Copied from lib/scoring.ts & lib/norm-mapper.ts ---

function calculateTScore(raw, mean, stdDev) {
    if (!stdDev || stdDev === 0) return 50;
    const t = 50 + 10 * ((raw - mean) / stdDev);
    return Math.max(0, Math.min(100, t));
}

function mapNorms(rawNorms, competencyDefs) {
    const scaleMap = new Map();
    const competencyMap = new Map();

    const validCompetencyNames = new Set(competencyDefs.map(c => c.name));
    const validScaleNames = new Set();
    competencyDefs.forEach(c => {
        c.competency_scales.forEach(s => validScaleNames.add(s.scale_name));
    });

    const GLOBAL_TEST_ID = '8afa34fb-6300-4c5e-bc48-bbdb74c717d8';
    const sortedNorms = [...rawNorms].sort((a, b) => {
        const aIsGlobal = a.test_id === GLOBAL_TEST_ID;
        const bIsGlobal = b.test_id === GLOBAL_TEST_ID;
        if (aIsGlobal && !bIsGlobal) return -1;
        if (!aIsGlobal && bIsGlobal) return 1;
        return 0;
    });

    sortedNorms.forEach(n => {
        const name = n.category_name;
        const mean = Number(n.mean_value);
        const std = Number(n.std_dev_value);

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

function calculatePersonalityScores(answers, questions, scaleNorms, competencyNorms, competencies) {
    const scaleRawScores = {};

    Object.entries(answers).forEach(([qId, val]) => {
        const question = questions.find(q => q.id === qId);
        if (!question || !question.category) return;

        const score = typeof val === 'number' ? val : parseFloat(val);
        if (isNaN(score)) return;

        scaleRawScores[question.category] = (scaleRawScores[question.category] || 0) + score;
    });

    const scaleFinal = {};
    const scaleTMapped = {};

    Object.entries(scaleRawScores).forEach(([cat, raw]) => {
        const norm = scaleNorms.find(n => n.category_name === cat);
        const mean = norm?.mean_value || 0;
        const std = norm?.std_dev_value || 1;
        const t = calculateTScore(raw, mean, std);

        scaleFinal[cat] = { raw, t_score: t };
        scaleTMapped[cat] = t;
    });

    const competencyFinal = {};
    let totalRaw = 0;

    competencies.forEach(comp => {
        const scaleNames = comp.competency_scales.map(s => s.scale_name);
        let cRaw = 0;
        scaleNames.forEach(name => {
            cRaw += (scaleTMapped[name] || 0);
        });

        const cleanCompName = comp.name.replace('Comp_', '');
        const norm = competencyNorms.find(n => 
            n.category_name === comp.name || 
            n.category_name === cleanCompName ||
            `Comp_${n.category_name}` === comp.name
        );
        const mean = norm?.mean_value || 0;
        const std = norm?.std_dev_value || 1;
        const cT = calculateTScore(cRaw, mean, std);

        competencyFinal[comp.name] = { raw: cRaw, t_score: cT };
        totalRaw += cT;
    });

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

// --- Main Migration/Rescoring execution ---

async function rescoreCandidate() {
    const resultId = '2edb87ab-8142-4239-a642-a25920ee4934';
    const GLOBAL_TEST_ID = '8afa34fb-6300-4c5e-bc48-bbdb74c717d8';

    console.log(`Rescoring result ID: ${resultId}...`);

    // 1. Fetch test result info
    const { data: result, error: fetchResError } = await supabase
        .from('test_results')
        .select('*')
        .eq('id', resultId)
        .maybeSingle();

    if (fetchResError || !result) {
        console.error('Error fetching result:', fetchResError ? fetchResError.message : 'Not found');
        return;
    }

    const testId = result.test_id;
    const answersLog = result.answers_log;

    console.log(`Found result for test ID: ${testId}`);
    
    // 2. Fetch norms, competencies, and questions
    console.log('Fetching norms & metadata...');
    const [normsResult, competencyResult, questionsResult] = await Promise.all([
        supabase.from('test_norms').select('*').in('test_id', [testId, GLOBAL_TEST_ID]),
        supabase.from('competencies').select('id, name, competency_scales(scale_name)').eq('test_id', testId),
        supabase.from('test_questions').select('questions(*)').eq('test_id', testId)
    ]);

    if (normsResult.error || competencyResult.error || questionsResult.error) {
        console.error('Error fetching metadata:', normsResult.error || competencyResult.error || questionsResult.error);
        return;
    }

    const norms = normsResult.data || [];
    const competencyDefs = competencyResult.data || [];
    const questions = questionsResult.data?.map(r => r.questions) || [];

    const compList = competencyDefs.map(c => ({
        name: c.name,
        competency_scales: c.competency_scales
    }));

    const { scaleNorms, competencyNorms } = mapNorms(norms, compList);

    const scoringQuestions = questions.map(q => ({
        id: q.id,
        category: q.category || '기타'
    }));

    // 3. Map Answers with Reverse Scoring
    const answersMap = {};
    questions.forEach(q => {
        const rawVal = answersLog[q.id];
        if (rawVal !== undefined) {
            const val = q.is_reverse_scored ? (6 - rawVal) : rawVal;
            answersMap[q.id] = val;
        }
    });

    // 4. Calculate Scores
    console.log('Calculating rescored metrics...');
    const calculated = calculatePersonalityScores(
        answersMap,
        scoringQuestions,
        scaleNorms,
        competencyNorms,
        compList
    );

    const finalTScore = calculated.total.t_score;
    console.log(`Calculation results: Total Score = ${finalTScore}`);

    // 5. Update DB
    console.log('Updating test_results with rescored values...');
    const { data: updateData, error: updateError } = await supabase
        .from('test_results')
        .update({
            total_score: Math.round(finalTScore),
            t_score: Math.round(finalTScore),
            detailed_scores: calculated
        })
        .eq('id', resultId)
        .select();

    if (updateError) {
        console.error('Update failed:', updateError.message);
    } else {
        console.log('✅ Rescoring completed successfully! DB updated.');
        console.log(`New Score: ${updateData[0].total_score}`);
    }
}

rescoreCandidate();
