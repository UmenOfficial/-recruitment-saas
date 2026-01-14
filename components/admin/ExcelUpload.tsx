'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Data sent to API
interface QuestionPayload {
    category: string;
    difficulty: string; // Not in Excel, defaults to 'MEDIUM'
    content: string; // B column
    description: string; // C column
    options: string[]; // D-M columns
    correct_answer: number; // N column (index)
    type: string;
    score: number;
    image_url: null; // Always null for Excel
    is_reverse_scored: boolean;
    __rowNum__: number;
}

export default function ExcelUpload({ onSuccess, defaultType = 'APTITUDE' }: { onSuccess: () => void, defaultType?: 'APTITUDE' | 'PERSONALITY' }) {
    const [parsedData, setParsedData] = useState<QuestionPayload[]>([]);
    const [uploading, setUploading] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const [replaceMode, setReplaceMode] = useState(false);
    const [totalExcelRows, setTotalExcelRows] = useState(0);

    const onDrop = async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];

            // Use header: 'A' to get array of arrays or object with A,B,C keys
            // We'll use sheet_to_json with header: 1 to get array of arrays (rows)
            const jsonData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            setTotalExcelRows(jsonData.length);

            // Validate and Transform
            const validated: QuestionPayload[] = [];
            const errs: string[] = [];

            // Skip header row (index 0)
            jsonData.slice(1).forEach((row, idx) => {
                const rowNum = idx + 2;
                // Columns: 
                // A[0]: Category
                // B[1]: Content
                // C[2]: Description
                // D[3] ~ M[12]: Options 1~10
                // N[13]: Answer

                const content = row[1];
                if (!content) {
                    // Skip completely empty rows
                    if (row.length === 0) return;
                    errs.push(`Row ${rowNum}: 문제 내용(B열)이 누락되었습니다.`);
                    return;
                }

                if (defaultType === 'PERSONALITY') {
                    // C: Reverse Scoring ('R' means true)
                    const isReverse = row[2] && String(row[2]).trim().toUpperCase() === 'R';

                    validated.push({
                        category: row[0] || '성격척도',
                        difficulty: 'MEDIUM',
                        content: String(content),
                        description: '',
                        options: Array(5).fill(''),
                        correct_answer: -1,
                        type: defaultType,
                        score: 1,
                        image_url: null,
                        is_reverse_scored: isReverse,
                        __rowNum__: rowNum
                    });
                } else {
                    // APTITUDE Mode: Full Parsing
                    // Parse Options (D ~ M) => Indices 3 ~ 12
                    const options: string[] = [];
                    for (let i = 3; i <= 12; i++) {
                        if (row[i]) options.push(String(row[i]).trim());
                    }

                    if (options.length < 2) {
                        errs.push(`Row ${rowNum}: 선택지는 최소 2개 이상이어야 합니다. (D열, E열...)`);
                        return;
                    }

                    // Parse Answer
                    let correctIndex = 0;
                    const ansVal = row[13];
                    if (!ansVal) {
                        errs.push(`Row ${rowNum}: 정답(N열)이 누락되었습니다.`);
                        return;
                    }
                    const ansNum = parseInt(String(ansVal));
                    if (isNaN(ansNum) || ansNum < 1 || ansNum > options.length) {
                        errs.push(`Row ${rowNum}: 정답(N열)은 1 ~ ${options.length} 사이의 숫자여야 합니다.`);
                        return;
                    }
                    correctIndex = ansNum - 1; // 0-based

                    validated.push({
                        category: row[0] || '일반',
                        difficulty: 'MEDIUM',
                        content: String(content),
                        description: row[2] ? String(row[2]) : '',
                        options: options, // String array
                        correct_answer: correctIndex,
                        type: defaultType,
                        score: 1,
                        image_url: null,
                        is_reverse_scored: false,
                        __rowNum__: rowNum
                    });
                }
            });

            if (errs.length > 0) setErrors(errs);
            setParsedData(validated);

        } catch (e) {
            console.error(e);
            toast.error('파일 파싱 실패. 올바른 엑셀 파일인지 확인하세요.');
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
        maxFiles: 1
    });

    const handleUpload = async () => {
        if (parsedData.length === 0) return;
        setUploading(true);

        try {
            // Bulk Insert API Call
            // API expects `questions` array matching schema
            const res = await fetch('/api/admin/questions/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    questions: parsedData,
                    replace: replaceMode
                })
            });

            const result = await res.json();

            if (!res.ok) throw new Error(result.error);

            toast.success(`${result.count}개의 문제가 성공적으로 등록되었습니다!`);
            setParsedData([]);
            setErrors([]);
            onSuccess();

        } catch (e: any) {
            toast.error('업로드 실패: ' + e.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-slate-50 p-6 rounded-xl text-sm text-slate-600 mb-4 border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-3 h-[30px]">
                            <AlertTriangle className="text-amber-500" size={20} />
                            <span className="font-bold text-lg text-black">업로드 주의사항</span>
                        </div>
                        <ul className="list-disc list-inside space-y-2 marker:text-slate-400 text-xs tracking-tight whitespace-nowrap leading-relaxed">
                            {defaultType === 'APTITUDE' ? (
                                <>
                                    <li><strong>A열 (영역)</strong>: 예시 - 수리영역, 언어영역</li>
                                    <li><strong>B열 (문제 내용)</strong>: 필수 입력 (TEXT)</li>
                                    <li><strong>C열 (추가 설명)</strong>: 문제 보충 설명 (TEXT)</li>
                                    <li><strong>D열 ~ M열 (선택지)</strong>: 1번~10번 선택지 (최소 2개)</li>
                                    <li><strong>N열 (정답)</strong>: 정답 번호 (1 ~ 선택지 개수)</li>
                                </>
                            ) : (
                                <>
                                    <li><strong>A열 (성격척도)</strong>: 예시 - 외향성, 성실성</li>
                                    <li><strong>B열 (문제 내용)</strong>: 필수 입력 (TEXT)</li>
                                    <li><strong>C열 (역채점)</strong>: 역채점 문항인 경우 'R' 입력</li>
                                </>
                            )}
                        </ul>
                    </div>
                    {defaultType === 'APTITUDE' && (
                        <div className="bg-white p-4 rounded-lg border border-slate-200 text-xs h-full">
                            <div className="flex items-center gap-2 mb-3 h-[30px]">
                                <span className="font-bold text-lg text-slate-700">📌 참고사항</span>
                            </div>
                            <ul className="list-disc list-inside space-y-2 text-slate-500 leading-relaxed">
                                <li>이미지는 사용할 수 없습니다.</li>
                                <li>선택지가 5개면 H열까지만 입력하세요.</li>
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200
          ${isDragActive ? 'border-blue-500 bg-blue-50/50 scale-[0.99]' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'}`}
            >
                <input {...getInputProps()} />
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <FileSpreadsheet size={32} />
                </div>
                <p className="font-bold text-lg text-slate-700">엑셀 파일을 이곳에 드래그하세요</p>
                <p className="text-sm text-slate-500 mt-2">또는 클릭하여 파일을 선택할 수 있습니다.</p>
            </div>

            {errors.length > 0 && (
                <div className="bg-red-50 p-4 rounded-xl border border-red-100 animate-in fade-in slide-in-from-top-2">
                    <h4 className="font-bold text-red-800 flex items-center gap-2 mb-2">
                        <AlertTriangle size={18} /> 파싱 오류 ({errors.length}건)
                    </h4>
                    <ul className="text-sm text-red-700 list-disc list-inside max-h-32 overflow-y-auto custom-scrollbar">
                        {errors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                </div>
            )}

            {parsedData.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                        <div className="flex flex-col">
                            <span className="font-bold text-slate-700">미리보기 ({parsedData.length}개 항목)</span>
                            <span className="text-xs text-slate-400 font-normal">엑셀 전체 {totalExcelRows}행 (제목행 1개 제외 + 빈 행 제외)</span>
                        </div>
                        <button
                            onClick={handleUpload}
                            disabled={uploading}
                            className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50 transition-colors shadow-lg shadow-slate-200"
                        >
                            {uploading ? <Loader2 className="animate-spin" /> : <><Upload size={18} /> 데이터 업로드</>}
                        </button>
                    </div>

                    {/* Replace Option Checkbox */}
                    <div className="px-4 py-3 bg-red-50/50 border-b border-red-50 flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="replace-mode"
                            checked={replaceMode}
                            onChange={(e) => setReplaceMode(e.target.checked)}
                            className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                        />
                        <label htmlFor="replace-mode" className="text-sm font-bold text-red-600 cursor-pointer select-none">
                            기존 문항 초기화 후 업로드 (주의: 해당 유형의 기존 모든 문항이 삭제되고, 현재 문항으로 교체됩니다)
                        </label>
                    </div>

                    <div className="max-h-80 overflow-y-auto custom-scrollbar">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-white text-slate-500 sticky top-0 border-b z-10 shadow-sm">
                                <tr>
                                    <th className="p-4 font-semibold w-16">#</th>
                                    <th className="p-4 font-semibold w-24">{defaultType === 'APTITUDE' ? '영역' : '성격척도'}</th>
                                    <th className="p-4 font-semibold">문제 내용</th>
                                    {defaultType === 'PERSONALITY' && <th className="p-4 font-semibold w-20">역채점</th>}
                                    {defaultType === 'APTITUDE' && <th className="p-4 font-semibold w-24">선택지 수</th>}
                                    {defaultType === 'APTITUDE' && <th className="p-4 font-semibold w-20">정답</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {parsedData.map((row, i) => (
                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 text-slate-400 font-mono">{i + 1}</td>
                                        <td className="p-4"><span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">{row.category}</span></td>
                                        <td className="p-4 max-w-md">
                                            <div className="truncate font-medium text-slate-900">{row.content}</div>
                                            {row.description && <div className="truncate text-xs text-slate-400 mt-0.5">{row.description}</div>}
                                        </td>
                                        {defaultType === 'PERSONALITY' && (
                                            <td className="p-4">
                                                {row.is_reverse_scored ? <span className="text-red-600 font-bold bg-red-50 px-2 py-1 rounded text-xs">역채점</span> : '-'}
                                            </td>
                                        )}
                                        {defaultType === 'APTITUDE' && <td className="p-4 text-slate-600">{row.options.length}개</td>}
                                        {defaultType === 'APTITUDE' && <td className="p-4 font-mono font-bold text-blue-600">{row.correct_answer + 1}</td>}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}        </div>
    );
}
