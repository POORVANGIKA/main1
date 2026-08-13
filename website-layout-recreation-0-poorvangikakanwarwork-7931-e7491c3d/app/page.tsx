import { Header } from '@/components/header'
import { Hero } from '@/components/hero'
import { Features } from '@/components/features'
import { Footer } from '@/components/footer'

export default function Home() {
  return (
    <main className="min-h-screen relative">
      <Hero />
      <div className="relative z-50">
        <Header />
      </div>
      <Features />
      <Footer />
    </main>
  )
}
