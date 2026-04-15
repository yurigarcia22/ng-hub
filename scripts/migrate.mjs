import pg from 'pg'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const { Client } = pg
const __dirname = dirname(fileURLToPath(import.meta.url))

const client = new Client({
  connectionString: 'postgresql://postgres:Grupong2026@db.nzvqkxkqexteeclhqcyv.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
})

await client.connect()
console.log('Conectado ao Supabase')

const migrations = [
  '../supabase/migrations/001_initial_schema.sql',
  '../supabase/migrations/002_rls_policies.sql',
  '../supabase/migrations/003_indexes.sql'
]

for (const m of migrations) {
  const sql = readFileSync(join(__dirname, m), 'utf8')
  try {
    await client.query(sql)
    console.log(`OK ${m}`)
  } catch (e) {
    if (e.message.includes('already exists')) {
      console.log(`SKIP ${m} (ja existe)`)
    } else {
      console.error(`ERR ${m}: ${e.message}`)
    }
  }
}

await client.end()
console.log('Migrations completas')
