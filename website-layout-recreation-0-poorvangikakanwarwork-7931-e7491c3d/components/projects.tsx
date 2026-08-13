import Image from 'next/image'

const contentBlocks = [
  {
    id: 1,
    title: 'Block 1 - Add Your Content Here',
    description: 'Replace this with your own text content. This is a placeholder for left-aligned text blocks.',
    image: '/placeholder-1.jpg',
    imagePosition: 'right',
  },
  {
    id: 2,
    title: 'Block 2 - Your Second Section',
    description: 'Alternate between text and images for visual variety. Upload your own image to replace the placeholder.',
    image: '/placeholder-2.jpg',
    imagePosition: 'left',
  },
  {
    id: 3,
    title: 'Block 3 - Continue Your Story',
    description: 'Add as many content blocks as you need. Each can have its own text and image combination.',
    image: '/placeholder-3.jpg',
    imagePosition: 'right',
  },
]

export function Projects() {
  return (
    <section className="w-full py-20 px-4 md:px-8 bg-background">
      <div className="max-w-6xl mx-auto space-y-20">
        {contentBlocks.map((block, index) => (
          <div key={block.id} className="space-y-8">
            <div
              className={`grid grid-cols-1 md:grid-cols-2 gap-12 items-center ${
                block.imagePosition === 'left' && index % 2 === 0
                  ? 'md:grid-cols-2'
                  : 'md:grid-cols-2'
              }`}
            >
              {/* Text Content */}
              <div
                className={block.imagePosition === 'left' && index % 2 === 0 ? 'md:order-2' : ''}
              >
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  {block.title}
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  {block.description}
                </p>
                <button className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition">
                  Learn More
                </button>
              </div>

              {/* Image Placeholder */}
              <div
                className={block.imagePosition === 'left' && index % 2 === 0 ? 'md:order-1' : ''}
              >
                <div className="w-full aspect-video bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-border">
                  <div className="text-center">
                    <p className="text-muted-foreground text-sm">
                      Image Placeholder {block.id}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Replace with your image
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}
            {index < contentBlocks.length - 1 && (
              <div className="h-px bg-border" />
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
