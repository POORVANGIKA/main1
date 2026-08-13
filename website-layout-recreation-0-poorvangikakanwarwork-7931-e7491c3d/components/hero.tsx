'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'

const phrases = [
  'Welcome to Luma Vision',
  'Elevate Your Game with AI-Powered Analytics',
  'See the Court Differently. Master Every Stroke.',
  'Your Personal AI Badminton Coach.',
]

const images = ['/hero-2.jpg', '/hero-3.jpg', '/hero-4.jpg', '/hero-1.jpg']

export function Hero() {
  const [currentPhrase, setCurrentPhrase] = useState(0)
  const [currentImage, setCurrentImage] = useState(0)

  useEffect(() => {
    const phraseInterval = setInterval(() => {
      setCurrentPhrase((prev) => (prev + 1) % phrases.length)
    }, 4000)
    return () => clearInterval(phraseInterval)
  }, [])

  useEffect(() => {
    const imageInterval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % images.length)
    }, 4000)
    return () => clearInterval(imageInterval)
  }, [])

  return (
    <section className="relative h-screen w-full overflow-hidden" id="home">
      {/* Background Images with Carousel */}
      {images.map((image, idx) => (
        <Image
          key={idx}
          src={image}
          alt="Badminton court"
          fill
          className={`object-cover transition-opacity duration-1000 ${
            idx === currentImage ? 'opacity-100' : 'opacity-0'
          }`}
          priority={idx === 0}
          style={{ objectPosition: 'center' }}
        />
      ))}
      
      {/* Minimal Overlay for text contrast */}
      <div className="absolute inset-0 bg-black/5"></div>

      {/* Content */}
      <div className="relative h-full flex flex-col items-center justify-center px-4">
        {/* Rotating Headline */}
        <div className="h-20 md:h-24 flex items-center justify-center mb-8 relative">
          {phrases.map((phrase, idx) => (
            <h1
              key={idx}
              className={`absolute text-3xl md:text-4xl lg:text-5xl font-bold text-white text-center whitespace-nowrap transition-all duration-1000 ${
                idx === currentPhrase
                  ? 'opacity-100 scale-100'
                  : 'opacity-0 scale-95'
              }`}
            >
              {phrase}
            </h1>
          ))}
        </div>

        {/* Scroll Down Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2">
          <span className="text-white text-sm">Scroll Down</span>
          <svg
            className="w-6 h-6 text-white bounce-gentle"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </div>
      </div>
    </section>
  )
}
