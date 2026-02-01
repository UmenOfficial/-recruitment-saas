import { createServerSupabaseClient } from "@/lib/supabase/server";
import PracticeInterface from "./PracticeInterface";

interface PracticeProblem {
    category: string;
    label: string;
    question: React.ReactNode;
    options: string[];
    correctIndex: number;
    explanation: string;
    solution_logic: React.ReactNode;
}

const PRACTICE_PROBLEMS: Record<string, PracticeProblem> = {
    '언어논리': {
        category: '언어논리',
        label: '언어논리 예제',
        question: (
            <>
                사원 A, B, C 세 사람이 점심 식사로 한식, 중식, 일식 중 서로 다른 메뉴를 하나씩 선택했다. 아래의 조건을 토대로 반드시 참인 것을 고르시오.<br /><br />
                <div className="bg-slate-50 p-4 rounded-lg text-base font-normal mb-4">
                    [조 건]<br />
                    • B는 일식을 선택했다.<br />
                    • A는 한식을 선택하지 않았다.
                </div>
            </>
        ),
        options: [
            "A는 일식을 선택했다.",
            "B는 중식을 선택했다.",
            "C는 일식을 선택했다.",
            "C는 한식을 선택했다.",
            "A는 한식을 선택했다."
        ],
        correctIndex: 3, // 4번 (0-based: 3)
        explanation: "C는 한식을 선택했다.",
        solution_logic: (
            <>
                1. <strong>확정 정보 배치:</strong> 조건에서 "B=일식"이 확정되었습니다.<br />
                2. <strong>소거법 적용:</strong> A는 한식을 선택하지 않았고, B가 일식을 선택했으므로 A 역시 일식을 선택할 수 없습니다. 따라서 A는 중식을 선택하게 됩니다.<br />
                3. <strong>나머지 매칭:</strong> A(중식), B(일식)가 확정되었으므로 남은 메뉴인 한식은 C의 선택이 됩니다.
            </>
        )
    },
    '수리': {
        category: '수리',
        label: '수리능력 예제',
        question: (
            <>
                어떤 물건의 가격을 20% 인상한 후, 다시 10% 할인하여 판매했더니 10,800원이 되었다.<br />
                이 물건의 원래 가격은 얼마인가?
            </>
        ),
        options: [
            "10,000원", "10,500원", "11,000원", "11,500원", "12,000원"
        ],
        correctIndex: 0,
        explanation: "10,000원",
        solution_logic: (
            <>
                원가를 X라 하면, X * 1.2 * 0.9 = 10,800<br />
                1.08X = 10,800  ∴ X = 10,000
            </>
        )
    },
    // Fallback for other categories
    'DEFAULT': {
        category: '기본',
        label: '기본 예제',
        question: (
            <>
                다음 중 가장 적절한 것을 고르시오.<br />
                (예제 문제가 준비되지 않았습니다.)
            </>
        ),
        options: ["1번", "2번", "3번", "4번", "5번"],
        correctIndex: 0,
        explanation: "정답",
        solution_logic: <>해설이 준비되지 않았습니다.</>
    }
};

export default async function AptitudePracticePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    // Fetch Test Category via the first question
    const { data: firstQ } = await supabase
        .from('test_questions')
        .select(`
            questions (
                category
            )
        `)
        .eq('test_id', id)
        .limit(1)
        .single();

    const category = (firstQ as any)?.questions?.category || 'DEFAULT';

    // Select problem based on category, fallback to DEFAULT if not found, 
    // or fallback to '수리' if it was the previous default and map matches
    const problem = PRACTICE_PROBLEMS[category] || PRACTICE_PROBLEMS['수리'];

    return <PracticeInterface id={id} problem={problem} />;
}
