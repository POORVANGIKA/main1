import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AuthForm } from '@/components/auth-form'

export default async function SignInPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect('/')
  return (
    <div className="min-h-screen flex">
      {/* Left Side - Hero Section */}
      <div 
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ backgroundColor: '#0F172A' }}
      >
        {/* Background gradient overlay */}
        <div 
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(236, 72, 153, 0.3) 100%)',
            pointerEvents: 'none'
          }}
        />

        {/* Content */}
        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-20">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#14B8A6' }}>
              <span className="text-xl font-bold" style={{ color: '#0F172A' }}>L</span>
            </div>
            <h1 className="text-xl font-bold text-white">Luma Vision</h1>
          </div>

          {/* Badge */}
          <div className="inline-block px-4 py-2 rounded-full border" style={{ borderColor: '#14B8A6' }} className="mb-8">
            <span className="text-xs font-semibold" style={{ color: '#14B8A6' }}>
              AI-Powered Badminton Analytics
            </span>
          </div>

          {/* Main Heading */}
          <h2 className="text-5xl font-bold mb-6 leading-tight text-white">
            Master Your <span style={{ color: '#14B8A6' }}>Game</span>
            <br />
            with AI Insights.
          </h2>

          {/* Description */}
          <p className="text-lg leading-relaxed mb-12" style={{ color: '#CBD5E1' }}>
            Join players and coaches using Luma Vision to analyze court movement, classify shots with precision, and track shuttlecock trajectories with advanced AI technology.
          </p>
        </div>

        {/* Bottom Decorative */}
        <div className="relative z-10 flex gap-4">
          <span className="text-6xl font-bold opacity-20" style={{ color: '#14B8A6' }}>L</span>
          <span className="text-6xl font-bold opacity-20" style={{ color: '#14B8A6' }}>V</span>
        </div>
      </div>

      {/* Right Side - Sign In Form */}
      <div 
        className="w-full lg:w-1/2 flex flex-col p-8 lg:p-12"
        style={{ backgroundColor: '#0a0e27' }}
      >
        {/* Back Link */}
        <Link 
          href="/" 
          className="mb-12 text-sm flex items-center gap-2 hover:opacity-80 transition"
          style={{ color: '#64748B' }}
        >
          <span>←</span> Back to home
        </Link>

        <div className="flex-1 flex flex-col justify-center max-w-md">
          {/* Welcome Section */}
          <div className="mb-12">
            <h3 className="text-3xl font-bold mb-3 text-white">Welcome back</h3>
            <p style={{ color: '#CBD5E1' }}>
              Sign in to your Luma Vision account to access your analysis and progress.
            </p>
          </div>

          {/* Guest Option */}
          <div 
            className="p-6 rounded-lg mb-8 border"
            style={{ backgroundColor: 'rgba(20, 184, 166, 0.05)', borderColor: '#14B8A6' }}
          >
            <h4 className="font-semibold mb-2 text-white">Continue without signing in</h4>
            <p className="text-sm mb-4" style={{ color: '#CBD5E1' }}>
              Explore features as a guest. Sign in anytime to save your work.
            </p>
            <Link
              href="/"
              className="w-full py-2 rounded-lg border transition text-sm font-semibold text-center"
              style={{ borderColor: '#14B8A6', color: '#14B8A6' }}
            >
              Continue as Guest
            </Link>
          </div>

          <div className="mb-8 text-center text-sm" style={{ color: '#64748B' }}>
            or sign in with your account
          </div>

          {/* Auth Form */}
          <div className="bg-transparent">
            <AuthForm mode="sign-in" />
          </div>

          {/* Sign Up Link */}
          <div className="text-center mt-8 text-sm" style={{ color: '#CBD5E1' }}>
            Don't have an account?{' '}
            <Link href="/sign-up" className="font-semibold hover:opacity-80" style={{ color: '#14B8A6' }}>
              Create one for free
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
