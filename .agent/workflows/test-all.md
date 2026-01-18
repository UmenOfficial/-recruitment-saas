---
description: Run all tests and verification steps
---
# Test All Workflow

This workflow ensures the application code is robust and valid.

1. **Static Analysis**:
   // turbo
   - `npm run lint`

2. **Build Test**:
   - `npm run build`
   *(This verifies strict mode compliance and type safety)*

3. **Browser Verification (Agent Step)**:
   - If significant UI changes were made, spawn a browser subagent to click through the critical paths.

4. **Report**:
   - Summarize findings.
