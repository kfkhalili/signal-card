import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/auth/auth-error'
    redirectUrl.searchParams.set('error', 'Server configuration error.')
    return NextResponse.redirect(redirectUrl)
  }

  if (token_hash && type) {
    const response = NextResponse.redirect(new URL('/auth/complete-profile', request.url));
    const supabase = createSupabaseRouteHandlerClient({ request, response });

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (!error) {
      return response;
    }
  }

  // return the user to an error page with some instructions
  const redirectUrl = request.nextUrl.clone()
  redirectUrl.pathname = '/auth/auth-error'
  redirectUrl.searchParams.set('error', 'Invalid token or link expired.')
  return NextResponse.redirect(redirectUrl)
}