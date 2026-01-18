'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/global-client';
import { Save, AlertCircle, TrendingUp, Calculator, Calendar, ArrowRight, CheckCircle2, Circle, Clock, ChevronDown, ChevronUp, Check, Info } from 'lucide-react';
import { toast } from 'sonner';
import { fetchNormTests, fetchScoringDetails, saveNorms, saveNormVersion, activateNormVersion, fetchTestResultsForNorms } from './actions';
import { calculateTScore } from '@/lib/scoring';

const GLOBAL_TEST_ID = '8afa34fb-6300-4c5e-bc48-bbdb74c717d8';

interface TestNorm {
    id?: string;
    test_id: string;
    category_name: string;
    mean_value: number;
    std_dev_value: number;
}

interface CalculatedStat {
    category_name: string;
    mean_value: number;
    std_dev_value: number;
    sample_count: number;
    type: 'CATEGORY' | 'COMPETENCY' | 'TOTAL';
}

interface NormVersion {
    id: string;
    version_name: string;
    description: string;
    created_at: string;
    active_norms_snapshot: TestNorm[];
    is_active?: boolean;
}

export default function PersonalityScoringManagement() {
    const [tests, setTests] = useState<any[]>([]);
    const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
    const [categories, setCategories] = useState<string[]>([]);
    const [competencies, setCompetencies] = useState<string[]>([]);
    const [norms, setNorms] = useState<TestNorm[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [activeTab, setActiveTab] = useState<'NORM' | 'VERSIONS'>('NORM');

    // Global Date Range
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Calculation States
    const [calculatingStage, setCalculatingStage] = useState<'SCALE' | 'COMPETENCY' | 'TOTAL' | null>(null);
    const [previewStats, setPreviewStats] = useState<{
        stage: 'SCALE' | 'COMPETENCY' | 'TOTAL';
        data: CalculatedStat[];
    } | null>(null);

    const [latestApprovedStage, setLatestApprovedStage] = useState<0 | 1 | 2 | 3>(0);

    // Versions
    const [versions, setVersions] = useState<NormVersion[]>([]);
    const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
    const [newVersionName, setNewVersionName] = useState('');

    // Source Test Logic


    // View Details Modal
    const [viewVersion, setViewVersion] = useState<NormVersion | null>(null);

    // Default Date Range: Last 30 days including TODAY
    useEffect(() => {
        fetchTests();
        const end = new Date(); // To Today
        const start = new Date();
        start.setDate(end.getDate() - 30);
        setEndDate(end.toISOString().split('T')[0]);
        setStartDate(start.toISOString().split('T')[0]);
    }, []);

    useEffect(() => {
        if (selectedTestId) {
            fetchTestDetails(selectedTestId);
            fetchVersions(selectedTestId);
            setPreviewStats(null);
            setLatestApprovedStage(0);
        } else {
            setCategories([]);
            setCompetencies([]);
            setNorms([]);
            setVersions([]);
        }
    }, [selectedTestId]);

    useEffect(() => {
        if (norms.length > 0) {
            const hasTotal = norms.some(n => (n.category_name === 'TOTAL' || n.category_name === 'Comp_TOTAL') && n.std_dev_value > 0);
            const hasComp = norms.some(n => {
                const rawName = n.category_name.replace('Comp_', '').replace('Scale_', '');
                return competencies.includes(rawName) && n.std_dev_value > 0;
            });
            const hasScale = norms.some(n => {
                const rawName = n.category_name.replace('Scale_', '').replace('Comp_', '');
                return categories.includes(rawName) && n.std_dev_value > 0;
            });

            if (hasTotal) setLatestApprovedStage(3);
            else if (hasComp) setLatestApprovedStage(2);
            else if (hasScale) setLatestApprovedStage(1);
            else setLatestApprovedStage(0);
        }
    }, [norms, categories, competencies]);


    const fetchTests = async () => {
        try {
            setLoading(true);
            const res = await fetchNormTests();

            if (!res.success) throw new Error(res.error);
            const data = res.data || [];

            setTests(data);
            if (data && data.length > 0 && !selectedTestId) {
                setSelectedTestId(data[0].id);
            }
        } catch (error) {
            console.error(error);
            toast.error('검사 목록 로딩 실패');
        } finally {
            setLoading(false);
        }
    };

    const fetchTestDetails = async (testId: string) => {
        try {
            // Use Server Action
            const res = await fetchScoringDetails(testId, GLOBAL_TEST_ID);
            if (!res.success || !res.data) throw new Error(res.error);

            const { categories, competencies, norms, versions } = res.data;

            setCategories(categories);
            setCompetencies(competencies);

            // Sorting Logic (Moved from server action or kept here if raw data returned)
            const sortedVersions = (versions || []).sort((a: any, b: any) => {
                const aActive = a.is_active ? 1 : 0;
                const bActive = b.is_active ? 1 : 0;
                if (aActive !== bActive) return bActive - aActive;
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });
            setVersions(sortedVersions);

            const allKeys = Array.from(new Set(['TOTAL', ...categories, ...competencies]));
            const mergedNorms = allKeys.map(key => {
                const existing = norms.find((n: any) =>
                    n.category_name === key ||
                    n.category_name === `Scale_${key}` ||
                    n.category_name === `Comp_${key}`
                );
                return existing || {
                    test_id: key.startsWith('Comp_') || key === 'TOTAL' || competencies.includes(key) ? testId : GLOBAL_TEST_ID,
                    category_name: key,
                    mean_value: 0,
                    std_dev_value: 0
                } as TestNorm;
            });
            setNorms(mergedNorms);

        } catch (error) {
            console.error(error);
            toast.error('채점 정보 로딩 실패');
        }
    };

    const fetchVersions = async (testId: string) => {
        // Redundant as fetched in details, but kept for standalone refresh if needed
        // For now, simpler to just re-call fetchTestDetails or ignore if covered.
        // Let's rely on fetchTestDetails for full sync.
    }

    const handleCalculate = async (stage: 'SCALE' | 'COMPETENCY' | 'TOTAL') => {
        if (!selectedTestId || !startDate || !endDate) {
            toast.error('기간을 선택해주세요.');
            return;
        }
        setCalculatingStage(stage);
        setPreviewStats(null);

        try {
            // Use Server Action to bypass RLS
            // Pass target test ID only (backend will handle source selection if needed)
            const { data, count, meta, error } = await fetchTestResultsForNorms(selectedTestId, selectedTestId, startDate, endDate);

            if (error) throw new Error(error);
            if (!data || data.length === 0) {
                toast.info('조회된 데이터가 없습니다. (기간 및 응시 기록 확인)');
                setCalculatingStage(null);
                return;
            }

            // Show Success Toast with Count
            toast.success(`총 ${count}건의 유효 데이터를 로드했습니다.`);

            const valuesMap: Record<string, number[]> = {};

            if (stage === 'COMPETENCY') {
                // [Logic Update] Competency Norms must be based on Sum of Scale T-Scores.
                // 1. Calculate Scale Stats first (Mean/StdDev) from the current sample.
                const scaleValues: Record<string, number[]> = {};
                data.forEach((row: any) => {
                    const scales = row.detailed_scores?.scales || {};
                    Object.entries(scales).forEach(([k, v]: [string, any]) => {
                        const raw = typeof v === 'number' ? v : v.raw;
                        if (raw !== undefined) {
                            if (!scaleValues[k]) scaleValues[k] = [];
                            scaleValues[k].push(raw);
                        }
                    });
                });

                const scaleStats: Record<string, { mean: number, std: number }> = {};
                Object.entries(scaleValues).forEach(([k, vals]) => {
                    const n = vals.length;
                    if (n === 0) return;
                    const mean = vals.reduce((a, b) => a + b, 0) / n;
                    const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n > 1 ? n - 1 : 1);
                    const std = Math.sqrt(variance);
                    scaleStats[k] = { mean, std };
                });

                // 2. Calculate User-Level Competency Scores (Sum of Scale T-Scores)
                // Need metadata to know which scales belong to which competency
                const compMeta = meta?.competencies || [];
                const compDef: Record<string, string[]> = {};
                compMeta.forEach((c: any) => {
                    compDef[c.name] = c.competency_scales.map((cs: any) => cs.scale_name);
                });

                data.forEach((row: any) => {
                    const scales = row.detailed_scores?.scales || {};

                    Object.entries(compDef).forEach(([compName, scaleNames]) => {
                        let tSum = 0;
                        let valid = true;

                        // If no scales defined, skip
                        if (scaleNames.length === 0) valid = false;

                        scaleNames.forEach(sName => {
                            const rawObj = scales[sName];
                            const raw = (typeof rawObj === 'number') ? rawObj : rawObj?.raw;
                            const stat = scaleStats[sName];

                            if (raw !== undefined && stat) {
                                // [Refactor] Use shared calculateTScore for consistency and clamping
                                const t = calculateTScore(raw, stat.mean, stat.std);
                                tSum += t;
                            } else {
                                // Missing scale score or stats -> cannot calc competency
                                valid = false;
                            }
                        });

                        if (valid) {
                            if (!valuesMap[compName]) valuesMap[compName] = [];
                            valuesMap[compName].push(tSum);
                        }
                    });
                });

            } else if (stage === 'TOTAL') {
                // [Logic Update] Total Norms must be based on Sum of Competency T-Scores.

                // 1. Calculate Scale Stats
                const scaleValues: Record<string, number[]> = {};
                data.forEach((row: any) => {
                    const scales = row.detailed_scores?.scales || {};
                    Object.entries(scales).forEach(([k, v]: [string, any]) => {
                        const raw = typeof v === 'number' ? v : v.raw;
                        if (raw !== undefined) {
                            if (!scaleValues[k]) scaleValues[k] = [];
                            scaleValues[k].push(raw);
                        }
                    });
                });

                const scaleStats: Record<string, { mean: number, std: number }> = {};
                Object.entries(scaleValues).forEach(([k, vals]) => {
                    const n = vals.length;
                    if (n === 0) return;
                    const mean = vals.reduce((a, b) => a + b, 0) / n;
                    const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n > 1 ? n - 1 : 1);
                    const std = Math.sqrt(variance);
                    scaleStats[k] = { mean, std };
                });

                // 2. Calculate Competency Stats (to get Comp T-Scores)
                const compMeta = meta?.competencies || [];
                const compDef: Record<string, string[]> = {};
                compMeta.forEach((c: any) => {
                    compDef[c.name] = c.competency_scales.map((cs: any) => cs.scale_name);
                });

                const compValues: Record<string, number[]> = {};

                data.forEach((row: any) => {
                    const scales = row.detailed_scores?.scales || {};
                    Object.entries(compDef).forEach(([compName, scaleNames]) => {
                        let tSum = 0;
                        let valid = true;
                        if (scaleNames.length === 0) valid = false;

                        scaleNames.forEach(sName => {
                            const rawObj = scales[sName];
                            const raw = (typeof rawObj === 'number') ? rawObj : rawObj?.raw;
                            const stat = scaleStats[sName];
                            if (raw !== undefined && stat) {
                                const t = calculateTScore(raw, stat.mean, stat.std);
                                tSum += t;
                            } else {
                                valid = false;
                            }
                        });

                        if (valid) {
                            if (!compValues[compName]) compValues[compName] = [];
                            compValues[compName].push(tSum);
                        }
                    });
                });

                const compStats: Record<string, { mean: number, std: number }> = {};
                Object.entries(compValues).forEach(([k, vals]) => {
                    const n = vals.length;
                    if (n === 0) return;
                    const mean = vals.reduce((a, b) => a + b, 0) / n;
                    const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n > 1 ? n - 1 : 1);
                    const std = Math.sqrt(variance);
                    compStats[k] = { mean, std };
                });

                // 3. Calculate Final Total Raw (Sum of Competency T-Scores)
                data.forEach((row: any) => {
                    const scales = row.detailed_scores?.scales || {};
                    let totalCompTSum = 0;
                    let validTotal = true;

                    const compNames = Object.keys(compDef);
                    if (compNames.length === 0) {
                        // Fallback: Sum of Scale T-Scores if no competencies
                        let scaleTSum = 0;
                        Object.keys(scaleStats).forEach(sName => {
                            const rawObj = scales[sName];
                            const raw = (typeof rawObj === 'number') ? rawObj : rawObj?.raw;
                            const stat = scaleStats[sName];
                            if (raw !== undefined && stat) {
                                const t = calculateTScore(raw, stat.mean, stat.std);
                                scaleTSum += t;
                            }
                        });
                        totalCompTSum = scaleTSum;
                    } else {
                        compNames.forEach(compName => {
                            const scaleNames = compDef[compName];
                            let compRaw = 0;
                            let compValid = true;
                            if (scaleNames.length === 0) compValid = false;

                            scaleNames.forEach(sName => {
                                const rawObj = scales[sName];
                                const raw = (typeof rawObj === 'number') ? rawObj : rawObj?.raw;
                                const stat = scaleStats[sName];
                                if (raw !== undefined && stat) {
                                    const t = calculateTScore(raw, stat.mean, stat.std);
                                    compRaw += t;
                                } else {
                                    compValid = false;
                                }
                            });

                            if (compValid) {
                                const cStat = compStats[compName];
                                const cT = calculateTScore(compRaw, cStat.mean, cStat.std);
                                totalCompTSum += cT;
                            } else {
                                validTotal = false;
                            }
                        });
                    }

                    if (validTotal) {
                        if (!valuesMap['TOTAL']) valuesMap['TOTAL'] = [];
                        valuesMap['TOTAL'].push(totalCompTSum);
                    }
                });

            } else {
                // Fallback for SCALE (Raw Scores)
                data.forEach((row: any) => {
                    const details = row.detailed_scores;
                    if (!details) return;

                    const scales = details.scales || {};
                    Object.entries(scales).forEach(([key, val]: [string, any]) => {
                        const raw = typeof val === 'number' ? val : val.raw;
                        if (raw !== undefined) {
                            if (!valuesMap[key]) valuesMap[key] = [];
                            valuesMap[key].push(raw);
                        }
                    });
                });
            }

            const stats: CalculatedStat[] = Object.entries(valuesMap).map(([key, values]) => {
                const n = values.length;
                if (n === 0) return null;
                const mean = values.reduce((a, b) => a + b, 0) / n;
                const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n > 1 ? n - 1 : 1);
                const stdDev = Math.sqrt(variance);

                return {
                    category_name: key,
                    mean_value: mean,
                    std_dev_value: stdDev,
                    sample_count: n,
                    type: stage === 'SCALE' ? 'CATEGORY' : stage === 'COMPETENCY' ? 'COMPETENCY' : 'TOTAL'
                };
            }).filter(Boolean) as CalculatedStat[];

            if (!stats || stats.length === 0) {
                toast.info('계산 가능한 데이터가 없습니다.');
            } else {
                setPreviewStats({ stage, data: stats });
                toast.success(`분석 완료 (샘플 N=${data.length}). 결과를 검토하고 [적용 완료] 버튼을 눌러주세요.`);
            }
        } catch (error: any) {
            console.error(error);
            toast.error(`계산 오류: ${error.message || '알 수 없음'}`);
        } finally {
            setCalculatingStage(null);
        }
    };

    const handleApproveStage = async () => {
        if (!previewStats || !selectedTestId) return;

        try {
            const newNorms = previewStats.data.map(stat => {
                let prefix = '';
                let targetTestId = selectedTestId;

                if (stat.type === 'CATEGORY') {
                    prefix = 'Scale_';
                    targetTestId = GLOBAL_TEST_ID; // Use Global ID for Scales
                }
                else if (stat.type === 'COMPETENCY') {
                    prefix = 'Comp_';
                    targetTestId = selectedTestId;
                }
                else if (stat.type === 'TOTAL') {
                    prefix = 'Comp_';
                    targetTestId = selectedTestId;
                }

                // Ensure we don't double prefix if it already exists (unlikely but safe)
                const safeName = stat.category_name.startsWith(prefix)
                    ? stat.category_name
                    : `${prefix}${stat.category_name}`;

                return {
                    test_id: targetTestId,
                    category_name: safeName,
                    mean_value: parseFloat(stat.mean_value.toFixed(5)),
                    std_dev_value: parseFloat(stat.std_dev_value.toFixed(5))
                };
            });

            // Use Server Action
            const { success, error } = await saveNorms(newNorms);

            if (!success) throw new Error(error);

            setNorms(prev => {
                const statMap = new Map(newNorms.map(n => [n.category_name, n]));
                return prev.map(old => statMap.get(old.category_name) || old);
            });

            toast.success(`${previewStats.stage} 규준이 적용되었습니다.`);
            setPreviewStats(null);
            fetchTestDetails(selectedTestId);

        } catch (e: any) {
            console.error(e);
            toast.error('저장 실패: ' + e.message);
        }
    };

    const handleSaveVersion = async () => {
        if (!newVersionName.trim() || !selectedTestId) return;
        setSaving(true);
        try {
            // Use Server Action
            const { success, error } = await saveNormVersion(selectedTestId, newVersionName, norms);
            if (!success) throw new Error(error);

            toast.success(`버전 '${newVersionName}' 저장 및 활성화 완료`);
            setIsVersionModalOpen(false);
            setNewVersionName('');
            fetchTestDetails(selectedTestId); // Refresh versions list via details
        } catch (e: any) {
            console.error(e);
            toast.error('버전 저장 실패: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleActivateVersion = async (version: NormVersion) => {
        if (!selectedTestId) return;
        if (version.is_active) return; // Already active

        try {
            // [Safeguard] Fetch Competencies to ensure correct prefixes for Legacy Snapshots
            // We already have 'competencies' state from fetchDetails, can use that?
            // Safer to use logic consistent with action or just pass needed info. 
            // The logic in original code did complex normalization.
            // Let's keep normalization logic here as it depends on `competencies` state which we have.

            const compNames = new Set(competencies);

            const normsToRestore = version.active_norms_snapshot.map(n => {
                const name = n.category_name;

                // Determine Target ID based on name prefix logic
                const isScale = name.startsWith('Scale_') || (!name.startsWith('Comp_') && !name.startsWith('TOTAL') && !compNames.has(name));
                const targetId = isScale ? GLOBAL_TEST_ID : selectedTestId;

                // Normalize Name
                let newName = name;
                if (!name.startsWith('Scale_') && !name.startsWith('Comp_')) {
                    if (name === 'TOTAL' || name === 'ALL' || name.toUpperCase() === 'TOTAL') {
                        newName = 'Comp_TOTAL';
                    } else if (compNames.has(name)) {
                        newName = `Comp_${name}`;
                    } else {
                        newName = `Scale_${name}`;
                    }
                }

                return {
                    ...n,
                    category_name: newName,
                    test_id: targetId
                };
            });

            // Use Server Action
            const { success, error } = await activateNormVersion(selectedTestId, version.id, normsToRestore);

            if (!success) throw new Error(error);

            toast.success(`'${version.version_name}' 버전이 활성화되었습니다.`);

            // Close modal if open
            if (viewVersion?.id === version.id) setViewVersion(prev => prev ? { ...prev, is_active: true } : null);

            fetchTestDetails(selectedTestId); // Sync current working norms
        } catch (e: any) {
            console.error(e);
            toast.error('활성화 실패: ' + e.message);
        }
    };

    const renderStage = (
        stage: 'SCALE' | 'COMPETENCY' | 'TOTAL',
        stepNum: 1 | 2 | 3,
        title: string,
        isLocked: boolean
    ) => {
        const isCalculated = previewStats?.stage === stage;
        const isApproved = latestApprovedStage >= stepNum;

        return (
            <div className={`border rounded-xl p-6 transition-all ${isLocked ? 'bg-slate-50 border-slate-200 opacity-60' :
                isApproved ? 'bg-indigo-50/30 border-indigo-200' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isApproved ? 'bg-green-500 text-white' :
                            'bg-slate-100 text-slate-500'
                            }`}>
                            {isApproved ? <Check size={16} /> : stepNum}
                        </div>
                        <h3 className={`font-bold text-lg ${isLocked ? 'text-slate-400' : 'text-slate-800'}`}>
                            {title}
                        </h3>
                        {isApproved && <span className="text-xs text-green-600 font-bold bg-green-100 px-2 py-1 rounded">적용 완료</span>}
                    </div>

                    {!isLocked && (
                        <div className="flex items-center gap-2">
                            {isCalculated ? (
                                <button
                                    onClick={handleApproveStage}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 transition-colors shadow-sm flex items-center gap-2"
                                >
                                    <CheckCircle2 size={16} />
                                    규준 적용 / 저장
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleCalculate(stage)}
                                    disabled={calculatingStage !== null}
                                    className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors ${isApproved
                                        ? 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                                        }`}
                                >
                                    {calculatingStage === stage ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            계산 중...
                                        </>
                                    ) : (
                                        <>
                                            <Calculator size={16} />
                                            {title} 산출
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {isCalculated && (
                    <div className="mt-4 bg-slate-50 rounded-lg border border-slate-200 p-4 animate-in fade-in slide-in-from-top-2">
                        <div className="flex justify-between items-end mb-2">
                            <h4 className="font-bold text-sm text-slate-700">산출 결과 미리보기 ({previewStats?.data.length}건)</h4>
                            <button onClick={() => setPreviewStats(null)} className="text-xs text-slate-400 hover:text-slate-600 underline">닫기</button>
                        </div>
                        <div className="max-h-[200px] overflow-y-auto custom-scrollbar bg-white rounded border border-slate-200">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-100 sticky top-0">
                                    <tr>
                                        <th className="px-3 py-2">항목명</th>
                                        <th className="px-3 py-2 text-right">평균</th>
                                        <th className="px-3 py-2 text-right">표준편차</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {previewStats?.data.map((row, i) => (
                                        <tr key={i} className="border-b last:border-0 hover:bg-slate-50">
                                            <td className="px-3 py-2 text-slate-700">{row.category_name}</td>
                                            <td className="px-3 py-2 text-right font-mono text-slate-600">{row.mean_value.toFixed(5)}</td>
                                            <td className="px-3 py-2 text-right font-mono text-slate-600">{row.std_dev_value.toFixed(5)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p className="text-xs text-slate-400 mt-2 text-right">* [규준 적용 / 저장] 버튼을 눌러야 실제 db에 반영됩니다.</p>
                    </div>
                )}
            </div>
        );
    };

    const handleDownloadVerificationData = () => {
        if (!selectedTestId || !startDate || !endDate) {
            toast.error('기간을 선택해주세요.');
            return;
        }

        try {
            toast.info('대용량 데이터 추출을 시작합니다.');
            const url = `/api/export/norms?test_id=${selectedTestId}&start=${startDate}&end=${endDate}`;
            window.location.href = url;

        } catch (error: any) {
            console.error(error);
            toast.error('다운로드 요청 실패');
        }
    };

    return (
        <div className="flex h-[calc(100vh-120px)] gap-6">
            <div className="w-1/4 min-w-[250px] bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col shadow-sm">
                <div className="p-4 border-b bg-slate-50">
                    <h2 className="font-bold text-slate-800">인성검사 목록</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                    {tests.map(test => (
                        <button
                            key={test.id}
                            onClick={() => setSelectedTestId(test.id)}
                            className={`w-full text-left p-3 rounded-lg text-sm mb-1 transition-colors ${selectedTestId === test.id
                                ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-100'
                                : 'text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            <div className="line-clamp-1">{test.title}</div>
                            <div className="text-xs text-slate-400 mt-1">{test.created_at.split('T')[0]}</div>
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden shadow-sm">
                <div className="p-5 border-b bg-slate-50 flex justify-between items-center">
                    <div>
                        <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                            {tests.find(t => t.id === selectedTestId)?.title || '검사를 선택하세요'}
                            {latestApprovedStage === 3 && <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full border border-green-200">규준 설정 완료</span>}
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">T점수 규준 설정 및 버전 관리</p>
                    </div>

                    <div className="flex bg-slate-200 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab('NORM')}
                            className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${activeTab === 'NORM' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            규준 설정
                        </button>
                        <button
                            onClick={() => setActiveTab('VERSIONS')}
                            className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${activeTab === 'VERSIONS' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            규준 버전 관리
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
                    {!selectedTestId ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <TrendingUp size={48} className="mb-4 opacity-20" />
                            <p>왼쪽 목록에서 검사를 선택해주세요.</p>
                        </div>
                    ) : (
                        activeTab === 'NORM' ? (
                            <div className="max-w-4xl mx-auto space-y-8">
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                                            <Calendar size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-sm">통계 산출 기간 설정</h3>
                                            <p className="text-xs text-slate-500">모든 단계의 규준 산출에 적용됩니다.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="date"
                                            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                        />
                                        <ArrowRight size={16} className="text-slate-300" />
                                        <input
                                            type="date"
                                            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                        />
                                        <button
                                            onClick={handleDownloadVerificationData}
                                            className="ml-2 px-3 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 shadow-sm flex items-center gap-1 group"
                                            title="검증용 Raw Data 다운로드"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover:text-slate-600"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                                            검증용 데이터
                                        </button>
                                    </div>
                                </div>



                                <div className="space-y-4">
                                    {renderStage('SCALE', 1, '척도(Scale) 규준', false)}
                                    {renderStage('COMPETENCY', 2, '역량(Competency) 규준', latestApprovedStage < 1)}
                                    {renderStage('TOTAL', 3, '종합(Total) 규준', latestApprovedStage < 2)}
                                </div>

                                <div className="flex justify-end pt-8 border-t border-slate-200">
                                    <button
                                        onClick={() => setIsVersionModalOpen(true)}
                                        disabled={latestApprovedStage < 3}
                                        className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-transformation hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none flex items-center gap-2"
                                    >
                                        <Save size={18} />
                                        현재 설정을 새 버전으로 저장
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="max-w-5xl mx-auto">
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    <table className="w-full text-left table-fixed">
                                        <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                                            <tr>
                                                <th className="px-6 py-4 font-bold w-1/3">버전명</th>
                                                <th className="px-6 py-4 font-bold w-1/4">저장 일시</th>
                                                <th className="px-6 py-4 font-bold text-center w-1/6">항목 수</th>
                                                <th className="px-6 py-4 font-bold text-right w-1/4">활성화 상태</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {versions.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="p-8 text-center text-slate-400">
                                                        저장된 버전이 없습니다.
                                                    </td>
                                                </tr>
                                            ) : versions.map(v => (
                                                <tr key={v.id} className={`hover:bg-slate-50 transition-colors ${v.is_active ? 'bg-indigo-50/20' : ''
                                                    }`}>
                                                    <td className="px-6 py-4">
                                                        <button
                                                            onClick={() => setViewVersion(v)}
                                                            className="font-bold text-slate-800 hover:text-indigo-600 hover:underline text-left truncate w-full flex items-center gap-2"
                                                        >
                                                            {v.version_name}
                                                            <Info size={14} className="text-slate-400" />
                                                        </button>
                                                        {v.description && <div className="text-xs text-slate-500 truncate">{v.description}</div>}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-slate-600">
                                                        {new Date(v.created_at).toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-mono">
                                                            {v.active_norms_snapshot.length}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right flex justify-end items-center">
                                                        <label className="relative inline-flex items-center cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                className="sr-only peer"
                                                                checked={!!v.is_active}
                                                                onChange={() => handleActivateVersion(v)}
                                                            />
                                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                                            <span className={`ml-2 text-xs font-bold ${v.is_active ? 'text-indigo-600' : 'text-slate-400'}`}>
                                                                {v.is_active ? 'Active' : 'Inactive'}
                                                            </span>
                                                        </label>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )
                    )}
                </div>

                {isVersionModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">규준 버전 저장</h3>
                            <p className="text-sm text-slate-500 mb-4">
                                현재 적용된 모든 척도, 역량, 종합 규준을 버전 내역으로 저장합니다. 저장 시 이 버전이 <span className="font-bold text-indigo-600">즉시 활성화(Active)</span>됩니다.
                            </p>
                            <div className="mb-6">
                                <label className="block text-xs font-bold text-slate-700 mb-1">버전 이름</label>
                                <input
                                    autoFocus
                                    type="text"
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="예: 2024 하반기 공채 기준"
                                    value={newVersionName}
                                    onChange={(e) => setNewVersionName(e.target.value)}
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setIsVersionModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleSaveVersion}
                                    disabled={saving || !newVersionName.trim()}
                                    className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                >
                                    {saving ? '저장 중...' : '저장하기'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {viewVersion && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full h-[85vh] flex flex-col animate-in zoom-in-95 overflow-hidden">
                            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold">VERSION DETAILS</span>
                                        {viewVersion.is_active && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold flex items-center gap-1"><Check size={12} /> ACTIVE</span>}
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-800">{viewVersion.version_name}</h3>
                                    <p className="text-sm text-slate-500 mt-1">
                                        Created: {new Date(viewVersion.created_at).toLocaleString()}
                                    </p>
                                </div>
                                <button onClick={() => setViewVersion(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors">
                                    <span className="sr-only">Close</span>
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto bg-slate-50/30 p-6">
                                <div className="bg-white border rounded-lg shadow-sm">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-100 text-xs uppercase text-slate-600 font-bold sticky top-0">
                                            <tr>
                                                <th className="px-6 py-3 w-[120px]">구분 (Type)</th>
                                                <th className="px-6 py-3">항목명 (Category)</th>
                                                <th className="px-6 py-3 text-right">평균 (Mean)</th>
                                                <th className="px-6 py-3 text-right">표준편차 (StdDev)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {viewVersion.active_norms_snapshot.map((norm, idx) => {
                                                let type = '기타';
                                                let typeColor = 'bg-slate-100 text-slate-600';
                                                let displayName = norm.category_name;

                                                const name = norm.category_name;

                                                if (name === 'TOTAL' || name === 'Comp_TOTAL') {
                                                    type = '종합';
                                                    typeColor = 'bg-slate-900 text-white';
                                                    displayName = '종합 (Total)';
                                                } else if (name.startsWith('Scale_')) {
                                                    type = '척도';
                                                    typeColor = 'bg-blue-100 text-blue-700';
                                                    displayName = name.replace('Scale_', '');
                                                } else if (name.startsWith('Comp_')) {
                                                    type = '역량';
                                                    typeColor = 'bg-indigo-100 text-indigo-700';
                                                    displayName = name.replace('Comp_', '');
                                                } else {
                                                    // Fallback check against raw lists
                                                    if (categories.includes(name)) {
                                                        type = '척도';
                                                        typeColor = 'bg-blue-100 text-blue-700';
                                                    } else if (competencies.includes(name)) {
                                                        type = '역량';
                                                        typeColor = 'bg-indigo-100 text-indigo-700';
                                                    }
                                                }

                                                return (
                                                    <tr key={idx} className="hover:bg-slate-50">
                                                        <td className="px-6 py-3">
                                                            <span className={`px-2 py-1 rounded text-xs font-bold ${typeColor}`}>
                                                                {type}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-3 font-medium text-slate-700">{displayName}</td>
                                                        <td className="px-6 py-3 text-right font-mono text-slate-600">{norm.mean_value.toFixed(2)}</td>
                                                        <td className="px-6 py-3 text-right font-mono text-slate-600">{norm.std_dev_value.toFixed(2)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="p-5 border-t bg-slate-50 flex justify-between items-center">
                                <span className="text-xs text-slate-400">
                                    Total Items: {viewVersion.active_norms_snapshot.length}
                                </span>
                                <div className="flex gap-3">
                                    <button onClick={() => setViewVersion(null)} className="px-5 py-2 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50 shadow-sm transition-colors">
                                        닫기
                                    </button>
                                    <button
                                        onClick={() => {
                                            handleActivateVersion(viewVersion);
                                            // Don't close, logic updates state inside Modal
                                        }}
                                        disabled={!!viewVersion.is_active}
                                        className={`px-5 py-2 font-bold rounded-lg shadow-sm transition-all flex items-center gap-2 ${viewVersion.is_active
                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                            : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:-translate-y-0.5'
                                            }`}
                                    >
                                        {viewVersion.is_active ? (
                                            <>
                                                <CheckCircle2 size={16} /> 현재 활성화 상태
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 size={16} /> 이 버전을 활성화하기
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
