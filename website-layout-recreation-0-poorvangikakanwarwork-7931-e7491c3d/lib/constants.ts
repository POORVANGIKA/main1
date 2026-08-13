// Analysis Status Constants
export const ANALYSIS_STATUS = {
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const

// Video Upload Constants
export const VIDEO_UPLOAD = {
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  ALLOWED_FORMATS: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'],
  ALLOWED_EXTENSIONS: ['mp4', 'mov', 'avi', 'webm'],
} as const

// UI Constants
export const UI = {
  TOAST_DURATION: 3000,
  ANIMATION_DURATION: 300,
} as const

// API Routes
export const API_ROUTES = {
  UPLOAD: '/api/upload',
  AUTH: '/api/auth',
} as const

// Messages
export const MESSAGES = {
  UPLOAD_SUCCESS: 'Video uploaded successfully. Processing analysis...',
  UPLOAD_ERROR: 'Failed to upload video. Please try again.',
  ANALYSIS_COMPLETE: 'Analysis complete! View your results below.',
  ANALYSIS_FAILED: 'Analysis processing failed. Please try again.',
  DELETE_SUCCESS: 'Analysis deleted successfully.',
  DELETE_ERROR: 'Failed to delete analysis.',
  UNAUTHORIZED: 'Please sign in to continue.',
} as const
