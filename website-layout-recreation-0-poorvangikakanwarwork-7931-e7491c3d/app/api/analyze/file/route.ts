import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { promises as fsPromises } from 'fs'

const PROJECT_ROOT = process.cwd()
const OUTPUT_BASE_DIR = path.join(PROJECT_ROOT, 'backend_analysis')

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const analysisId = url.searchParams.get('analysis_id')
  const fileName = url.searchParams.get('file')

  if (!analysisId || !fileName) {
    return NextResponse.json({ error: 'Missing analysis_id or file parameter' }, { status: 400 })
  }

  const filePath = path.join(OUTPUT_BASE_DIR, analysisId, fileName)
  const normalizedFilePath = path.normalize(filePath)

  if (!normalizedFilePath.startsWith(path.normalize(OUTPUT_BASE_DIR + path.sep))) {
    return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
  }

  if (!(await fsPromises.stat(normalizedFilePath).catch(() => null))) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  const fileStream = fs.createReadStream(normalizedFilePath)
  const ext = path.extname(fileName).toLowerCase()
  const contentType = ext === '.png' || ext === '.jpg' || ext === '.jpeg'
    ? `image/${ext.slice(1)}`
    : ext === '.mp4'
    ? 'video/mp4'
    : 'application/octet-stream'

  return new NextResponse(fileStream, {
    status: 200,
    headers: {
      'Content-Type': contentType,
    },
  })
}
