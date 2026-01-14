export default function AptitudeTestPage({ params }: { params: { id: string } }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <h1 className="text-4xl font-bold mb-4">실전 검사 화면 (적성)</h1>
            <p className="text-slate-500 text-lg max-w-md">
                타이머와 함께 실제 적성검사가 진행되는 화면입니다.<br />
                문항 데이터 연동 및 타이머 로직 구현이 필요합니다.
            </p>
            <div className="mt-8 p-4 bg-slate-100 rounded-lg text-sm text-slate-400 font-mono">
                Page: /candidate/aptitude/{params.id}/test
            </div>
        </div>
    );
}
