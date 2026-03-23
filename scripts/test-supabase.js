import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

// Use your env variables exactly
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.log('Supabase URL:', supabaseUrl ? '✅ found' : '❌ missing')
  console.log('Supabase Key:', supabaseKey ? '✅ found' : '❌ missing')
  throw new Error('Supabase URL or Key not found in environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  try {
    const { data, error } = await supabase.from('events').select('*')
    console.log('Events:', data)
    console.log('Error:', error)
  } catch (err) {
    console.error('Caught error:', err)
  }
}

main()