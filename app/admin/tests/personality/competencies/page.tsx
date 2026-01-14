'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/database';
import { SupabaseClient } from '@supabase/supabase-js';

// Instantiate a typed client for this component or use provided hook/context if available.
// Reusing the one from lib is fine if typed, ensuring explicit type usage here.
const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
) as SupabaseClient<Database>;
import { Loader2, Plus, Save, Trash2, GripVertical, ChevronRight, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';

// Types
type Test = {
    id: string;
    title: string;
    type: string;
    status: string;
};

type Competency = {
    id: string;
    name: string;
    description: string;
    scales: string[]; // List of category names
};

// HTML5 Drag & Drop Constants
const DRAG_TYPE = "SCALE";

export default function CompetencyPage() {
    const [tests, setTests] = useState<Test[]>([]);
    const [selectedTestId, setSelectedTestId] = useState<string>('');
    const [loading, setLoading] = useState(true);

    // Data for the selected test
    const [availableScales, setAvailableScales] = useState<string[]>([]); // Derived from questions
    const [competencies, setCompetencies] = useState<Competency[]>([]);

    // Editing State
    const [editingCompetencyId, setEditingCompetencyId] = useState<string | null>(null);
    const [formData, setFormData] = useState<{ name: string; description: string; scales: string[] }>({
        name: '', description: '', scales: []
    });

    useEffect(() => {
        fetchTests();
    }, []);

    useEffect(() => {
        if (selectedTestId) {
            fetchTestDetails(selectedTestId);
        } else {
            setAvailableScales([]);
            setCompetencies([]);
            setEditingCompetencyId(null);
        }
    }, [selectedTestId]);

    const fetchTests = async () => {
        const { data, error } = await supabase
            .from('tests')
            .select('id, title, type, status')
            .neq('id', '8afa34fb-6300-4c5e-bc48-bbdb74c717d8') // Hide Global Placeholder
            .order('created_at', { ascending: false }) as any;

        if (error) {
            console.error('Error fetching tests:', error);
            toast.error('검사 목록을 불러오지 못했습니다.');
            return;
        }

        console.log('Fetched tests:', data);
        if (data) {
            const personalityTests = data.filter((t: any) => t.type && t.type.includes('PERSONALITY'));
            console.log('Filtered Personality Tests:', personalityTests);
            setTests(personalityTests);

            // Auto-select if there's only one or just to be helpful
            if (personalityTests.length > 0 && !selectedTestId) {
                setSelectedTestId(personalityTests[0].id);
            }
        }
        setLoading(false);
    };

    const fetchTestDetails = async (testId: string) => {
        setLoading(true);
        try {
            const { count } = await supabase.from('test_questions').select('*', { count: 'exact', head: true }).eq('test_id', testId) as any;

            let categories: string[] = [];

            if (count && count > 0) {
                const { data: testQs } = await supabase
                    .from('test_questions')
                    .select('questions(category)')
                    .eq('test_id', testId) as any;

                categories = Array.from(new Set(testQs?.map((t: any) => t.questions?.category).filter(Boolean) || []));
            } else {
                const { data: allQs } = await supabase.from('questions').select('category').eq('type', 'PERSONALITY') as any;
                categories = Array.from(new Set(allQs?.map((q: any) => q.category).filter(Boolean) || []));
            }

            setAvailableScales(categories.sort());

            const { data: comps } = await supabase
                .from('competencies')
                .select(`
                    id, 
                    name, 
                    description, 
                    competency_scales(scale_name)
                `)
                .eq('test_id', testId)
                .order('created_at', { ascending: true }) as any;

            if (comps) {
                const formatted = comps.map((c: any) => ({
                    id: c.id,
                    name: c.name,
                    description: c.description || '',
                    scales: c.competency_scales.map((cs: any) => cs.scale_name)
                }));
                setCompetencies(formatted);
            }

        } catch (e) {
            console.error(e);
            toast.error('데이터를 불러오는 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // --- Actions ---

    const handleCreateCompetency = () => {
        setEditingCompetencyId('NEW');
        setFormData({ name: '', description: '', scales: [] });
    };

    const handleEditCompetency = (comp: Competency) => {
        setEditingCompetencyId(comp.id);
        setFormData({ name: comp.name, description: comp.description, scales: [...comp.scales] });
    };

    const handleCancelEdit = () => {
        setEditingCompetencyId(null);
    };

    const handleSave = async () => {
        if (!selectedTestId) return;
        if (!formData.name.trim()) return toast.error('역량명을 입력해주세요.');

        try {
            let compId = editingCompetencyId;

            if (editingCompetencyId === 'NEW') {
                const { data, error } = await (supabase
                    .from('competencies') as any)
                    .insert({
                        test_id: selectedTestId,
                        name: formData.name,
                        description: formData.description
                    })
                    .select()
                    .single();

                if (error) throw error;
                compId = data.id;
            } else {
                const { error } = await (supabase
                    .from('competencies') as any)
                    .update({
                        name: formData.name,
                        description: formData.description
                    })
                    .eq('id', editingCompetencyId); // Correct variable name

                if (error) throw error;
            }

            if (compId && compId !== 'NEW') {
                await supabase.from('competency_scales').delete().eq('competency_id', compId) as any;

                if (formData.scales.length > 0) {
                    const mapped = formData.scales.map(s => ({
                        competency_id: compId,
                        scale_name: s
                    }));
                    // Fix never type error on insert
                    await (supabase.from('competency_scales') as any).insert(mapped);
                }
            }

            toast.success('저장되었습니다.');
            setEditingCompetencyId(null);
            fetchTestDetails(selectedTestId);

        } catch (e: any) {
            toast.error('저장 실패: ' + e.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        await supabase.from('competencies').delete().eq('id', id) as any;
        toast.success('삭제되었습니다.');
        fetchTestDetails(selectedTestId);
    };

    // --- Drag & Drop Handlers ---

    // Used when dragging FROM the Available List
    const onDragStart = (e: React.DragEvent, scale: string) => {
        e.dataTransfer.setData(DRAG_TYPE, scale);
        e.dataTransfer.effectAllowed = 'copy';
    };

    // Target Area Drop
    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const scale = e.dataTransfer.getData(DRAG_TYPE);
        if (scale && !formData.scales.includes(scale)) {
            setFormData(prev => ({ ...prev, scales: [...prev.scales, scale] }));
        }
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const removeScale = (scaleToRemove: string) => {
        setFormData(prev => ({
            ...prev,
            scales: prev.scales.filter(s => s !== scaleToRemove)
        }));
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">역량방정식 생성</h1>
                    <p className="text-slate-500 mt-1">인성검사의 성격 척도를 조합하여 역량을 정의합니다.</p>
                </div>

                <div className="w-64">
                    <select
                        className="w-full p-2 border border-slate-300 rounded-md text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        value={selectedTestId}
                        onChange={(e) => setSelectedTestId(e.target.value)}
                    >
                        <option value="">검사를 선택하세요</option>
                        {tests.map(t => (
                            <option key={t.id} value={t.id}>{t.title}</option>
                        ))}
                    </select>
                </div>
            </div>

            {!selectedTestId ? (
                <div className="flex flex-col items-center justify-center py-32 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-200 transition-colors">
                    <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 border border-slate-100">
                        <ClipboardList className="text-blue-500" size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">작업할 검사를 선택해주세요</h3>
                    <p className="text-slate-500 text-sm max-w-sm text-center">
                        우측 상단의 드롭다운 메뉴에서 역량을 정의할<br />
                        인성검사를 선택하시면 작업 공간이 활성화됩니다.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Competency List */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold text-lg text-slate-900">역량 목록</h2>
                            <button
                                onClick={handleCreateCompetency}
                                className="flex items-center gap-1 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700"
                            >
                                <Plus size={16} /> 생성
                            </button>
                        </div>

                        <div className="space-y-2">
                            {competencies.map(comp => (
                                <div
                                    key={comp.id}
                                    onClick={() => handleEditCompetency(comp)}
                                    className={`p-4 border rounded-lg cursor-pointer transition-all hover:border-blue-300
                                        ${editingCompetencyId === comp.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'bg-white'}
                                    `}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-slate-900">{comp.name}</h3>
                                            <p className="text-xs text-slate-600 mt-1">{comp.scales.length}개의 척도 포함</p>
                                        </div>
                                        <ChevronRight size={16} className="text-slate-400" />
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {comp.scales.map(s => (
                                            <span key={s} className="px-2 py-0.5 bg-slate-100 text-slate-900 text-[10px] rounded-full font-medium">
                                                {s}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            {competencies.length === 0 && (
                                <p className="text-sm text-slate-400 text-center py-8">등록된 역량이 없습니다.</p>
                            )}
                        </div>
                    </div>

                    {/* Right: Editor */}
                    <div className="lg:col-span-2">
                        {editingCompetencyId ? (
                            <div className="bg-white border rounded-xl shadow-sm p-6 space-y-6">
                                <div className="flex justify-between items-start border-b pb-4">
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-900">
                                            {editingCompetencyId === 'NEW' ? '새 역량 생성' : '역량 편집'}
                                        </h2>
                                        <p className="text-sm text-slate-500">역량 정보를 입력하고 우측의 척도를 드래그하여 추가하세요.</p>
                                    </div>
                                    <div className="flex gap-2">
                                        {editingCompetencyId !== 'NEW' && (
                                            <button
                                                onClick={() => handleDelete(editingCompetencyId)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-md"
                                                title="삭제"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-slate-900">역량명</label>
                                        <input
                                            type="text"
                                            className="w-full p-2 border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                            placeholder="예: 끊임 없는 성장"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-slate-900">설명</label>
                                        <textarea
                                            className="w-full p-2 border border-slate-300 rounded-md h-20 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                            placeholder="역량에 대한 설명..."
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Drag & Drop Area */}
                                <div className="grid grid-cols-2 gap-6 mt-6">
                                    {/* Source: Available Scales */}
                                    <div className="bg-slate-50 p-4 rounded-lg border">
                                        <h3 className="text-sm font-semibold mb-3 text-slate-900">사용 가능한 척도</h3>
                                        <div className="space-y-2 h-[300px] overflow-y-auto pr-1">
                                            {availableScales.filter(s => !formData.scales.includes(s)).map(scale => (
                                                <div
                                                    key={scale}
                                                    draggable
                                                    onDragStart={(e) => onDragStart(e, scale)}
                                                    className="bg-white p-2.5 rounded shadow-sm border cursor-grab hover:border-blue-400 active:cursor-grabbing flex items-center gap-2 group"
                                                >
                                                    <GripVertical size={14} className="text-slate-400" />
                                                    <span className="text-sm font-medium text-slate-900">{scale}</span>
                                                    <button
                                                        onClick={() => setFormData(prev => ({ ...prev, scales: [...prev.scales, scale] }))}
                                                        className="ml-auto text-blue-600 opacity-0 group-hover:opacity-100 hover:bg-blue-50 rounded p-0.5"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Target: Selected Scales */}
                                    <div
                                        onDrop={onDrop}
                                        onDragOver={onDragOver}
                                        className="bg-blue-50/50 p-4 rounded-lg border-2 border-dashed border-blue-200 min-h-[300px]"
                                    >
                                        <h3 className="text-sm font-semibold mb-3 text-blue-900">구성된 척도 (총점의 합)</h3>

                                        {formData.scales.length === 0 ? (
                                            <div className="h-[250px] flex items-center justify-center text-blue-300 text-sm text-center">
                                                왼쪽에서 척도를<br />드래그하여 놓으세요
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {formData.scales.map(scale => (
                                                    <div
                                                        key={scale}
                                                        className="bg-white p-2.5 rounded shadow-sm border border-blue-100 flex items-center justify-between"
                                                    >
                                                        <span className="text-sm font-medium text-slate-900">{scale}</span>
                                                        <button
                                                            onClick={() => removeScale(scale)}
                                                            className="text-slate-400 hover:text-red-500"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-6 border-t">
                                    <button
                                        onClick={handleCancelEdit}
                                        className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-md"
                                    >
                                        취소
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow-sm flex items-center gap-2"
                                    >
                                        <Save size={16} /> 저장하기
                                    </button>
                                </div>

                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center bg-slate-50 border rounded-xl text-slate-400 min-h-[400px]">
                                <div className="text-center">
                                    <p className="mb-2">선택된 역량이 없습니다.</p>
                                    <button
                                        onClick={handleCreateCompetency}
                                        className="text-blue-600 hover:underline text-sm font-medium"
                                    >
                                        새 역량 만들기
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
