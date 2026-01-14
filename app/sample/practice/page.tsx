import PersonalityPracticePage from "@/app/candidate/personality/[id]/practice/page";

// Re-use existing component with dummy params
// The existing component expects Promise<{ id: string }>
export default async function SamplePracticePage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams;
    const testId = params.testId as string;

    // We wrap it to provide the props it expects.
    // The underlying component uses `use(params)` to extract ID.
    const dummyParams = Promise.resolve({ id: testId });

    return <PersonalityPracticePage params={dummyParams} />;
}
