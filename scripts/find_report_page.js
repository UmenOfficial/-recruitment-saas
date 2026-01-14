
const { execSync } = require('child_process');

try {
    const result = execSync("fd 'page.tsx' app/admin/tests/personality/results", { encoding: 'utf-8' });
    console.log(result);
} catch (e) {
    console.error(e);
}
