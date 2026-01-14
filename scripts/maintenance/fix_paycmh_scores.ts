
import { createClient } from '@supabase/supabase-js';
import { calculatePersonalityScores, DetailedScores } from './lib/scoring';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixPaycmhScores() {
    const email = 'test_user@umen.cloud';
    const { data: user } = await supabase.from('users').select('id').eq('email', email).single();
    if (!user) return console.log('User not found');

    const { data: results } = await supabase
        .from('test_results')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(1);

    if (!results || results.length === 0) return console.log('No results');
    const r = results[0];
    console.log(`Fixing Result ID: ${r.id}`);

    // Fetch Questions
    const { data: relations } = await supabase
        .from('test_questions')
        .select('question_id, questions(*)')
        .eq('test_id', r.test_id);

    const questions = relations?.map((rel: any) => rel.questions) || [];

    // Fetch Norms
    const { data: norms } = await supabase
        .from('test_norms')
        .select('category_name, mean_value, std_dev_value')
        .eq('test_id', r.test_id);

    // Fetch Competency Definitions
    const { data: compDefs } = await supabase
        .from('competencies')
        .select('name, competency_scales(scale_name)')
        .eq('test_id', r.test_id);

    // Prepare Answers
    const answersMap = r.answers_log;
    const qOrder = r.questions_order;
    if (!qOrder) return console.log('No questions_order found');

    const mappedAnswers: Record<string, number> = {};
    Object.entries(answersMap).forEach(([idxStr, val]) => {
        const qId = qOrder[parseInt(idxStr)];
        if (qId) mappedAnswers[qId] = val as number;
    });

    // Prepare Q List
    const questionList = qOrder.map((qid: string) => {
        const q = questions.find((q: any) => q.id === qid);
        return {
            id: qid,
            category: q?.category || '기타',
        };
    });

    // Apply Reverse Scoring
    const finalAnswers: Record<string, number> = {};
    Object.entries(mappedAnswers).forEach(([qid, val]) => {
        const q = questions.find((q: any) => q.id === qid);
        if (q && q.is_reverse_scored) {
            finalAnswers[qid] = 6 - val;
        } else {
            finalAnswers[qid] = val;
        }
    });

    // Prepare Norms
    const scaleNorms = norms?.filter((n: any) => n.category_name.startsWith('Scale_'))
        .map((n: any) => ({
            category_name: n.category_name.replace('Scale_', ''),
            mean_value: Number(n.mean_value),
            std_dev_value: Number(n.std_dev_value)
        })) || [];

    const competencyNorms = norms?.filter((n: any) => n.category_name.startsWith('Comp_'))
        .map((n: any) => ({
            category_name: n.category_name.replace('Comp_', ''),
            mean_value: Number(n.mean_value),
            std_dev_value: Number(n.std_dev_value)
        })) || [];

    // Prepare Competencies
    const compList = (compDefs || []).map((c: any) => ({
        name: c.name,
        competency_scales: c.competency_scales
    }));

    // RUN CALCULATION
    const calculated = calculatePersonalityScores(
        finalAnswers,
        questionList,
        scaleNorms,
        competencyNorms,
        compList
    );

    // Sanity Check
    const suspicious = Object.entries(calculated.scales).filter(([k, v]) => v.t_score > 100 || v.t_score < 0);
    if (suspicious.length > 0) {
        console.warn("Suspicious Scores (>100 or <0):", suspicious);
        // We still save them because -23 is valid mathematically given the inputs, better than 50.
        // But > 100 might indicate missing norm (210).
        const missing = suspicious.filter(([k, v]) => v.t_score > 200);
        if (missing.length > 0) {
            console.error("Missing Norms likely for:", missing.map(m => m[0]));
        }
    }

    // UPDATE DATABASE
    const finalTScore = calculated.total.t_score;
    const payload = {
        total_score: Math.round(finalTScore),
        t_score: Math.round(finalTScore),
        detailed_scores: calculated,
        updated_at: new Date().toISOString()
    };

    const { error } = await supabase
        .from('test_results')
        .update(payload)
        .eq('id', r.id);

    if (error) {
        console.error("Update Failed:", error);
    } else {
        console.log("Update Success! New Total T-Score:", finalTScore);
    }
}

fixPaycmhScores();
