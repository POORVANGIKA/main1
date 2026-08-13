'use client'

import Link from 'next/link'

export function Footer() {
  return (
    <footer style={{ backgroundColor: '#0F172A' }} className="w-full">
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-14">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
          {/* Logo and Description Section */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm" style={{ backgroundColor: '#14B8A6' }}>
                <span className="font-bold" style={{ color: '#0F172A' }}>L</span>
              </div>
              <h3 className="text-base font-bold" style={{ color: '#FFFFFF' }}>Luma Vision</h3>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: '#64748B' }}>
              AI-driven badminton analytics platform developed at MNIT Jaipur for court coverage mapping, shot classification, and shuttle tracking.
            </p>
          </div>

          {/* Platform Column */}
          <div>
            <h4 className="text-xs font-semibold mb-4" style={{ color: '#14B8A6' }}>Platform</h4>
            <nav className="flex flex-col gap-3">
              <Link href="/" className="text-xs transition hover:opacity-80" style={{ color: '#CBD5E1' }}>
                Home
              </Link>
              <Link href="#progress" className="text-xs transition hover:opacity-80" style={{ color: '#CBD5E1' }}>
                My Progress
              </Link>
              <Link href="#settings" className="text-xs transition hover:opacity-80" style={{ color: '#CBD5E1' }}>
                Settings
              </Link>
            </nav>
          </div>

          {/* About Column */}
          <div>
            <h4 className="text-xs font-semibold mb-4" style={{ color: '#14B8A6' }}>About</h4>
            <nav className="flex flex-col gap-3">
              <Link href="#" className="text-xs transition hover:opacity-80" style={{ color: '#CBD5E1' }}>
                MNIT Jaipur
              </Link>
              <Link href="#" className="text-xs transition hover:opacity-80" style={{ color: '#CBD5E1' }}>
                Collaborators
              </Link>
              <Link href="#" className="text-xs transition hover:opacity-80" style={{ color: '#CBD5E1' }}>
                Contact
              </Link>
            </nav>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t pt-6" style={{ borderColor: '#1E293B' }}>
          <p className="text-xs" style={{ color: '#64748B' }}>
            © 2026 lumavision - MNIT Jaipur
          </p>
        </div>
      </div>
    </footer>
  )
}
