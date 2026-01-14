import { Suspense } from 'react';
import PersonalityTestPage from "@/app/candidate/personality/[id]/test/page";

// Helper component to extract searchParams and wrap PersonalityTestPage
async function SampleTestWrapper({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams;
    const testId = params.testId as string;

    // Create dummy params object that matches what PersonalityTestPage expects
    const dummyParams = Promise.resolve({ id: testId });

    return <PersonalityTestPage params={dummyParams} />;
}

export default function SampleTestPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <SampleTestWrapper searchParams={searchParams} />
        </Suspense>
    );
}
