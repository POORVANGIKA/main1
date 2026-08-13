'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { courtAnalyses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { put } from '@vercel/blob'
import { v4 as uuidv4 } from 'uuid'

// Get user ID helper
async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

// Upload video and create analysis record
export async function uploadVideoForAnalysis(formData: FormData) {
  const userId = await getUserId()
  const file = formData.get('file') as File
  
  if (!file) throw new Error('No file provided')
  
  const analysisId = uuidv4()
  const fileName = `${analysisId}-${file.name}`
  
  try {
    // Upload to Vercel Blob
    const blob = await put(fileName, file, {
      access: 'private',
      addRandomSuffix: false,
    })

    console.log('[v0] Video uploaded to Blob:', blob.url)

    // Create analysis record in database
    const analysisRecord = {
      id: analysisId,
      userId,
      videoUrl: blob.url,
      videoFileName: file.name,
      analysisStatus: 'processing',
      processingStartedAt: new Date(),
    }

    // Insert into database
    await db.insert(courtAnalyses).values(analysisRecord)

    return {
      success: true,
      analysisId,
      videoUrl: blob.url,
      message: 'Video uploaded successfully',
    }
  } catch (error) {
    console.error('[v0] Upload error:', error)
    throw new Error('Failed to upload video')
  }
}

// Send video to backend for processing
export async function processVideoWithBackend(
  analysisId: string,
  videoUrl: string,
  backendUrl: string = 'http://localhost:8000'
) {
  const userId = await getUserId()

  try {
    console.log('[v0] Sending video to backend:', backendUrl)

    // Call backend API to process the video
    const response = await fetch(`${backendUrl}/analyze/video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_url: videoUrl,
        analysis_id: analysisId,
      }),
    })

    if (!response.ok) {
      throw new Error(`Backend error: ${response.statusText}`)
    }

    const result = await response.json()

    console.log('[v0] Backend processing result:', result)

    // Update analysis with results
    await db
      .update(courtAnalyses)
      .set({
        analysisStatus: 'completed',
        analysisData: result.analysis,
        zoneData: result.zones,
        heatmapData: result.heatmap,
        topPlayerZoneCoverage: result.top_player_zones,
        bottomPlayerZoneCoverage: result.bottom_player_zones,
        processingCompletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(courtAnalyses.id, analysisId))

    return {
      success: true,
      analysis: result,
    }
  } catch (error) {
    console.error('[v0] Processing error:', error)
    
    // Update status to failed
    await db
      .update(courtAnalyses)
      .set({
        analysisStatus: 'failed',
        updatedAt: new Date(),
      })
      .where(eq(courtAnalyses.id, analysisId))

    throw new Error('Failed to process video with backend')
  }
}

// Get analysis results
export async function getAnalysisResults(analysisId: string) {
  const userId = await getUserId()

  const result = await db
    .select()
    .from(courtAnalyses)
    .where(eq(courtAnalyses.id, analysisId))
    .limit(1)

  if (!result.length || result[0].userId !== userId) {
    throw new Error('Analysis not found')
  }

  return result[0]
}

// Get user's analyses
export async function getUserAnalyses() {
  const userId = await getUserId()

  const results = await db
    .select()
    .from(courtAnalyses)
    .where(eq(courtAnalyses.userId, userId))

  return results
}

// Delete analysis
export async function deleteAnalysis(analysisId: string) {
  const userId = await getUserId()

  const analysis = await db
    .select()
    .from(courtAnalyses)
    .where(eq(courtAnalyses.id, analysisId))
    .limit(1)

  if (!analysis.length || analysis[0].userId !== userId) {
    throw new Error('Analysis not found')
  }

  // Delete from database
  await db
    .delete(courtAnalyses)
    .where(eq(courtAnalyses.id, analysisId))

  return { success: true }
}
