const fs = require('fs');
const path = require('path');

const url = process.env.SUPABASE_URL || '';
const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || '';

const content = `// Generated file - do not commit
export const supabaseEnv = {
  url: ${JSON.stringify(url)},
  key: ${JSON.stringify(key)}
};
`;

const dir = path.join(__dirname, 'src', 'app');
if (!fs.existsSync(dir)){
  fs.mkdirSync(dir, { recursive: true });
}

fs.writeFileSync(path.join(dir, 'supabase-env.ts'), content);
console.log('Successfully injected Supabase environment variables into src/app/supabase-env.ts');
