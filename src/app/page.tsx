import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (user && !error) {
    redirect('/dashboard')
  }

  redirect('/login')
}
