---
description: Create a new evaluation module in the admin panel
---
# New Module Workflow

This workflow scaffolds a new evaluation module in `app/admin/evaluations/[module_name]`.

1. **Input**: Determine the module name (e.g., `competency-audit`).
   - Variable: `MODULE_NAME`

2. **Create Directories**:
   - `mkdir -p app/admin/evaluations/${MODULE_NAME}`

3. **Create `page.tsx`**:
   - File: `app/admin/evaluations/${MODULE_NAME}/page.tsx`
   - Content:
     ```tsx
     import { Suspense } from 'react';
     
     export default function Page() {
       return (
         <div className="space-y-6">
           <h1 className="text-2xl font-bold">Module Title</h1>
           <Suspense fallback={<div>Loading...</div>}>
             {/* Content */}
           </Suspense>
         </div>
       );
     }
     ```

4. **Create `actions.ts`**:
   - File: `app/admin/evaluations/${MODULE_NAME}/actions.ts`
   - Content:
     ```typescript
     'use server';
     
     import { createServerSupabaseClient } from '@/lib/supabase/server';
     
     // Define actions here
     ```

5. **Notification**:
   - Remind the user to add the new link to `components/admin/sidebar.tsx` or `AGENTS.md` if needed.
