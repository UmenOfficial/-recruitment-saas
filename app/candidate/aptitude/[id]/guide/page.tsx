import Link from "next/link";
import { ArrowLeft, ArrowRight, BrainCircuit, Timer, Search } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface GuideContent {
    intro: {
        title: string;
        description: string;
    };
    evaluation: {
        title: string;
        items: { title: string; desc: string }[];
    };
}

const CATEGORY_GUIDES: Record<string, GuideContent> = {
    '언어논리': {
        intro: {
            title: '언어논리 영역',
            description: '언어논리 영역은 단순히 글을 읽는 능력을 넘어, 주어진 정보 사이의 논리적 관계를 파악하고 합리적으로 추론하는 능력을 평가합니다.'
        },
        evaluation: {
            title: '평가 내용',
            items: [
                { title: '논리적 추론', desc: '복잡한 조건(진실/거짓, 인물 배치 등)을 바탕으로 결론을 도출하는 능력' },
                { title: '명제 분석', desc: '전제와 결론 사이의 타당성을 파악하고 대우 명제 등을 활용해 논리적 오류를 찾는 능력' }
            ]
        }
    },
    // Default fallback
    'DEFAULT': {
        intro: {
            title: '적성검사 안내',
            description: '지원자의 직무 수행에 필요한 기초적인 인지 능력과 잠재력을 종합적으로 평가합니다.'
        },
        evaluation: {
            title: '평가 내용',
            items: [
                { title: '기초 인지 능력', desc: '정보를 빠르고 정확하게 처리하는 능력' },
                { title: '문제 해결 능력', desc: '주어진 상황을 분석하고 합리적인 대안을 도출하는 능력' }
            ]
        }
    }
};

export default async function AptitudeGuidePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    // 1. Fetch Test Details
    const { data: test } = await supabase
        .from('tests')
        .select(`
            *,
            test_questions (
                count
            )
        `)
        .eq('id', id)
        .single();

    if (!test) return <div>Test not found</div>;

    // 2. Fetch Category (from the first question)
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
    const content = CATEGORY_GUIDES[category] || CATEGORY_GUIDES['DEFAULT'];
    const questionCount = (test as any).test_questions?.[0]?.count || 0;
    const timeLimit = (test as any).time_limit || 0;

    return (
        <div className="max-w-3xl mx-auto">
            <div className="mb-8">
                <Link href="/candidate/dashboard" className="text-slate-500 hover:text-slate-900 flex items-center gap-2 mb-4">
                    <ArrowLeft size={20} />
                    대시보드로 돌아가기
                </Link>
                <h1 className="text-3xl font-bold text-slate-900">적성검사 유의사항</h1>
                <p className="text-slate-500 mt-2">최상의 컨디션에서 응시해 주세요.</p>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col min-h-[600px]">

                <div className="flex-1 flex flex-col justify-center space-y-16">
                    {/* 1. Area Introduction */}
                    <div className="flex gap-4">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <BrainCircuit size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">{content.intro.title}</h3>
                            <p className="text-slate-600 mt-1 leading-relaxed">
                                {content.intro.description}
                            </p>
                        </div>
                    </div>

                    {/* 2. Evaluation Content */}
                    <div className="flex gap-4">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <Search size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">{content.evaluation.title}</h3>
                            <div className="mt-2 text-slate-600 space-y-1">
                                {content.evaluation.items.map((item, idx) => (
                                    <p key={idx}>
                                        <span className="font-bold text-slate-700">{item.title}:</span> {item.desc}
                                    </p>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 3. Time Management */}
                    <div className="flex gap-4">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <Timer size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">시간 관리</h3>
                            <p className="text-slate-600 mt-1 leading-relaxed">
                                해당 영역은 <span className="font-bold text-slate-900">{timeLimit}분</span> 안에 총 <span className="font-bold text-slate-900">{questionCount}문항</span>을 풀이해야 하며, 문항 수에 비해 시간이 부족할 수 있습니다.<br />
                                모르는 문제는 과감히 넘어가고, 아는 문제부터 빠르고 정확하게 푸는 전략이 필요합니다.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="pt-8 border-t border-slate-100 flex justify-center">
                    <Link
                        href={`/candidate/aptitude/${id}/practice`}
                        className="bg-blue-500 text-white px-8 py-4 rounded-xl font-bold hover:bg-blue-600 transition-colors flex items-center gap-2 shadow-lg shadow-blue-200"
                    >
                        연습문제 풀기 <ArrowRight size={20} />
                    </Link>
                </div>

            </div>
        </div>
    );
}
