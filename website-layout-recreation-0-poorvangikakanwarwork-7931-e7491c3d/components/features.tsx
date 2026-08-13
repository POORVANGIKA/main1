'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const features = [
  {
    id: 1,
    title: 'Shot Classification',
    image: '/shot-classification.png',
  },
  {
    id: 2,
    title: 'Court Coverage',
    image: '/court-coverage.png',
    href: '/court-coverage',
  },
  {
    id: 3,
    title: 'Shuttle Analysis',
    image: '/shuttle-analysis.jpeg',
  },
]

export function Features() {
  const [currentIndex, setCurrentIndex] = useState(0)

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + features.length) % features.length)
  }

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % features.length)
  }

  return (
    <section className="py-24 px-4 md:px-8 bg-background min-h-screen flex items-center">
      <div className="max-w-7xl mx-auto w-full">
        {/* Section Header */}
        <div className="mb-20">
          <div className="w-16 h-1 mb-8" style={{ backgroundColor: '#D5BC8A' }}></div>
          <h2 className="text-5xl md:text-6xl font-bold text-foreground">FEATURES</h2>
        </div>

        {/* Carousel Container */}
        <div className="relative">
          {/* Navigation Arrows */}
          <div className="absolute top-0 right-0 flex gap-4 z-10">
            <button
              onClick={goToPrevious}
              className="p-2 hover:opacity-75 transition-opacity"
              aria-label="Previous slide"
              style={{ color: '#D5BC8A' }}
            >
              <ChevronLeft size={32} />
            </button>
            <button
              onClick={goToNext}
              className="p-2 hover:opacity-75 transition-opacity"
              aria-label="Next slide"
              style={{ color: '#D5BC8A' }}
            >
              <ChevronRight size={32} />
            </button>
          </div>

          {/* Carousel Viewport - Shows 3 Cards */}
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{
                transform: `translateX(-${currentIndex * (100 / 3)}%)`,
              }}
            >
              {/* Repeating cards for carousel loop */}
              {[...features, ...features, ...features].map((feature, index) => (
                <div
                  key={`${feature.id}-${index}`}
                  className="min-w-[calc(100%/3)] px-2"
                >
                  {feature.href ? (
                    <Link href={feature.href}>
                      <div className="relative h-96 group cursor-pointer">
                        {/* Geometric Overlay - Left Side */}
                        <div
                          className="absolute left-0 top-0 bottom-0 z-10 pointer-events-none"
                          style={{
                            width: '120px',
                            background: 'linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 100%)',
                            clipPath: 'polygon(0 0, 100% 20%, 100% 80%, 0 100%)',
                          }}
                        />

                        {/* Image Container */}
                        <div className="relative h-full overflow-hidden rounded-sm">
                          <Image
                            src={feature.image}
                            alt={feature.title}
                            fill
                            className={`object-cover transition-transform duration-300 group-hover:scale-105 ${feature.id === 3 ? 'object-right' : ''}`}
                          />

                          {/* Dark Overlay */}
                          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-all duration-300" />
                        </div>

                        {/* Title - Bottom Center */}
                        <div className="absolute bottom-0 left-0 right-0 p-8" style={{ backgroundImage: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.85) 40%, transparent 100%)' }}>
                          <h3 className="text-3xl font-bold text-white drop-shadow-lg">
                            {feature.title}
                          </h3>
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <div className="relative h-96 group cursor-pointer">
                      {/* Geometric Overlay - Left Side */}
                      <div
                        className="absolute left-0 top-0 bottom-0 z-10 pointer-events-none"
                        style={{
                          width: '120px',
                          background: 'linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 100%)',
                          clipPath: 'polygon(0 0, 100% 20%, 100% 80%, 0 100%)',
                        }}
                      />

                      {/* Image Container */}
                      <div className="relative h-full overflow-hidden rounded-sm">
                        <Image
                          src={feature.image}
                          alt={feature.title}
                          fill
                          className={`object-cover transition-transform duration-300 group-hover:scale-105 ${feature.id === 3 ? 'object-right' : ''}`}
                        />

                        {/* Dark Overlay */}
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-all duration-300" />
                      </div>

                      {/* Title - Bottom Center */}
                      <div className="absolute bottom-0 left-0 right-0 p-8" style={{ backgroundImage: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.85) 40%, transparent 100%)' }}>
                        <h3 className="text-3xl font-bold text-white drop-shadow-lg">
                          {feature.title}
                        </h3>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Carousel Indicators */}
          <div className="flex justify-center gap-2 mt-8">
            {features.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className="transition-all duration-300"
                style={{
                  width: currentIndex === index ? '32px' : '12px',
                  height: '4px',
                  backgroundColor: currentIndex === index ? '#D5BC8A' : 'rgba(213, 188, 138, 0.3)',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
        </div>

        {/* CTA Section - Below Carousel */}
        <div className="mt-24 p-12 rounded-lg bg-primary text-white">
          <p className="text-xl font-medium leading-relaxed">
            Ready to transform your badminton game with AI-powered insights?
          </p>
          <button
            className="mt-8 px-8 py-3 font-semibold transition-all duration-300 hover:translate-x-1 bg-accent text-primary hover:opacity-90"
          >
            GET STARTED →
          </button>
        </div>
      </div>
    </section>
  )
}
