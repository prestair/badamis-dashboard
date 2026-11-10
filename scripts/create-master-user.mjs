import { readFileSync } from 'fs';
import { resolve } from 'path';

// Read .env.local
const envPath = resolve(process.cwd(), '.env.local');
const envText = readFileSync(envPath, 'utf8');
const env = {};
for (const line of envText.split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, '');
}

const url = env['NEXT_PUBLIC_SUPABASE_URL'];
const serviceRoleKey = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!url || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const res = await fetch(`${url}/rest/v1/app_users`, {
  method: 'POST',
  headers: {
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  },
  body: JSON.stringify({
    username: 'master',
    password: 'tsrite@184',
    role: 'admin',
    full_name: 'Master',
    active: true,
    can_edit_completed: true,
    can_edit_daily_report: true
  })
});

if (res.status === 409) {
  console.log('User "master" already exists — skipping insert.');
  process.exit(0);
}

if (!res.ok) {
  const body = await res.text();
  console.error('Failed to insert user:', res.status, body);
  process.exit(1);
}

const data = await res.json();
console.log('Created master user:', JSON.stringify(data, null, 2));
