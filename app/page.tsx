import { Suspense } from "react";
import { fetchPosts } from "./community/actions";
import { getPublishedContents } from "./admin/contents/actions";
import HomePageContent from "./HomePageContent";
import SampleTestModal from "@/components/SampleTestModal";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const posts = await fetchPosts();
  const uClassContents = await getPublishedContents();

  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <HomePageContent initialPosts={posts.slice(0, 3)} uClassContents={uClassContents} />
      <SampleTestModal />
    </Suspense>
  );
}
