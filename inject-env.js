const fs = require('fs');
const path = require('path');

const url = process.env.SUPABASE_URL || 'https://vefyegxmvjficncbetyp.supabase.co';
const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZnllZ3htdmpmaWNuY2JldHlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyNjYwMjksImV4cCI6MjA5Nzg0MjAyOX0.ioaZkwS98123Jb2xw2l6vev3FgoLwIVwsitg7pTew7c';

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
