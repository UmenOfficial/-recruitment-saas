import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// Define the type here or import if shared
interface QuestionPayload {
    content: string;
    description: string; // Added description
    image_url: string | null;
    options: string[];
    correct_answer: number;
    score: number;
    category: string;
    type: string;
    is_reverse_scored?: boolean;
}

export async function POST(request: Request) {
    try {
        const supabase = await createServerSupabaseClient();
        const body = await request.json();
        const questions: QuestionPayload[] = body.questions;
        const replace = body.replace || false; // Check for replace flag

        if (!questions || !Array.isArray(questions) || questions.length === 0) {
            return NextResponse.json({ error: 'No questions provided' }, { status: 400 });
        }

        // Determine the type for replacement scope (assume all uploaded questions are of the same type)
        // If mixed, we might need to handle differently, but usually bulk upload is one type.
        const targetType = questions[0].type || 'APTITUDE';

        let impactedTestIds: string[] = [];

        if (replace) {
            // 1. Identify Impacted Tests
            // Find all questions of this type first
            const { data: oldQuestions, error: findError } = await (supabase
                .from('questions')
                .select('id')
                .eq('type', targetType) as any);

            if (findError) {
                console.error('Error finding old questions:', findError);
                return NextResponse.json({ error: 'Failed to find existing questions' }, { status: 500 });
            }

            if (oldQuestions && oldQuestions.length > 0) {
                const oldIds = oldQuestions.map((q: any) => q.id);

                // Find tests that use these questions
                // Note: using 'in' with a large array might hit limits, but for 200 questions it's fine.
                const { data: linkedTests, error: linkError } = await (supabase
                    .from('test_questions')
                    .select('test_id') as any)
                    .in('question_id', oldIds);

                if (linkError) {
                    console.error('Error finding linked tests:', linkError);
                    // Proceeding with caution? Or stop? Better to stop if we can't identify impact.
                    return NextResponse.json({ error: 'Failed to identify linked tests' }, { status: 500 });
                }

                if (linkedTests) {
                    impactedTestIds = Array.from(new Set(linkedTests.map((t: any) => t.test_id)));
                }

                // 2. Delete Existing Questions
                // Cascade delete will remove test_questions entries automatically.
                const { error: deleteError } = await supabase
                    .from('questions')
                    .delete()
                    .eq('type', targetType);

                if (deleteError) {
                    console.error('Error deleting old questions:', deleteError);
                    return NextResponse.json({ error: 'Failed to delete existing questions' }, { status: 500 });
                }
            }
        }

        // 3. Insert New Questions
        const insertData = questions.map(q => ({
            content: q.content,
            description: q.description,
            image_url: q.image_url,
            options: q.options,
            correct_answer: q.correct_answer,
            score: q.score,
            category: q.category || 'General',
            type: q.type || 'APTITUDE',
            is_reverse_scored: q.is_reverse_scored || false,
            created_at: new Date().toISOString()
        }));

        const { data: newQuestions, error: insertError } = await (supabase
            .from('questions') as any)
            .insert(insertData)
            .select();

        if (insertError) {
            console.error('Supabase Insert Error:', insertError);
            return NextResponse.json({ error: insertError.message }, { status: 500 });
        }

        // 4. Re-Link to Tests (if Replace was active and tests were found)
        if (replace && impactedTestIds.length > 0 && newQuestions) {
            const newLinks: any[] = [];
            for (const testId of impactedTestIds) {
                newQuestions.forEach((q: any, index: number) => {
                    newLinks.push({
                        test_id: testId,
                        question_id: q.id,
                        order_index: index + 1 // Maintain order from Excel
                    });
                });
            }

            if (newLinks.length > 0) {
                const { error: relinkError } = await (supabase
                    .from('test_questions') as any)
                    .insert(newLinks);

                if (relinkError) {
                    console.error('Error re-linking questions:', relinkError);
                    // We don't rollback insertion here as questions are valid, but we warn.
                    return NextResponse.json({
                        success: true,
                        count: newQuestions.length,
                        warning: 'Questions uploaded but failed to re-link to tests. Please check test configuration manually.'
                    });
                }
            }
        }

        return NextResponse.json({
            success: true,
            count: newQuestions.length,
            message: replace
                ? `Successfully replaced and re-linked ${newQuestions.length} questions for ${impactedTestIds.length} tests.`
                : `Successfully uploaded ${newQuestions.length} questions`
        });

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
