import { supabase } from '../lib/supabase';

async function checkBuckets() {
    console.log("Checking buckets...");
    const buckets = ['resumes', 'portfolios'];

    for (const bucket of buckets) {
        try {
            const { data, error } = await supabase.storage.from(bucket).list();
            if (error) {
                console.error(`Error accessing bucket '${bucket}':`, error.message);
            } else {
                console.log(`Bucket '${bucket}' is accessible. File count:`, data.length);
            }
        } catch (e: any) {
            console.error(`Exception checking '${bucket}':`, e.message);
        }
    }
}

checkBuckets();
