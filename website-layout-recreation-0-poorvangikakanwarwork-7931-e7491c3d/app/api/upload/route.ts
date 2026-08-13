import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { courtAnalyses } from '@/lib/db/schema'
import { v4 as uuidv4 } from 'uuid'
import { headers } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!file.type.startsWith('video/')) {
      return NextResponse.json({ error: 'File must be a video' }, { status: 400 })
    }

    const analysisId = uuidv4()
    const fileName = `${analysisId}-${file.name}`
    
    // Upload to Vercel Blob
    const blob = await put(fileName, file, {
      access: 'private',
      addRandomSuffix: false,
    })

    console.log('[v0] Video uploaded to Blob:', blob.url)

    // Create analysis record in database
    const analysisRecord = {
      id: analysisId,
      userId: session.user.id,
      videoUrl: blob.url,
      videoFileName: file.name,
      analysisStatus: 'processing',
      processingStartedAt: new Date(),
    }

    // Insert into database
    await db.insert(courtAnalyses).values(analysisRecord)

    return NextResponse.json({
      success: true,
      analysisId,
      videoUrl: blob.url,
      message: 'Video uploaded successfully',
    })
  } catch (error) {
    console.error('[v0] Upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload video' },
      { status: 500 }
    )
  }
}
