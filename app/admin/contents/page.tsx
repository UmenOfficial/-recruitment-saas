import { getContents } from './actions';
import ContentManager from './ContentManager';

export const dynamic = 'force-dynamic';

export default async function AdminContentsPage() {
    const contents = await getContents();

    return (
        <div>
            <ContentManager initialContents={contents} />
        </div>
    );
}
