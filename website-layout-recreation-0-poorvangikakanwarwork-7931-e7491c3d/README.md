# Luma Vision - Court Coverage Analyzer

A Next.js application for analyzing court video content with AI-powered insights, built with Better Auth, Neon PostgreSQL, and Vercel Blob storage.

## Features

✨ **User Authentication** - Secure email/password authentication with Better Auth
📹 **Video Upload** - Upload court videos (MP4, MOV, AVI, WebM) up to 100MB
📊 **Analysis Dashboard** - View all your uploaded videos and their analysis status
⚡ **Real-time Processing** - Monitor video analysis progress in real-time
👤 **User Profile** - Manage your account settings and view your activity
🛡️ **Error Handling** - Comprehensive error boundaries and user feedback

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS
- **Authentication**: Better Auth with email/password
- **Database**: Neon PostgreSQL with Drizzle ORM
- **Storage**: Vercel Blob for video files
- **UI Components**: Custom components with shadcn/ui patterns

## Project Structure

```
├── app/
│   ├── api/              # API routes (auth, upload)
│   ├── actions/          # Server actions for database operations
│   ├── court-coverage/   # Video upload and analysis page
│   ├── dashboard/        # User dashboard with analytics
│   ├── profile/          # User profile and settings
│   ├── sign-in/          # Login page
│   ├── sign-up/          # Registration page
│   └── layout.tsx        # Root layout with providers
├── components/
│   ├── ui/              # Reusable UI components
│   ├── auth-form.tsx    # Login/signup form
│   ├── error-boundary.tsx # Error handling
│   └── header.tsx       # Navigation header
├── lib/
│   ├── auth.ts          # Better Auth server config
│   ├── auth-client.ts   # Better Auth client
│   ├── db/              # Database setup and schema
│   ├── constants.ts     # Application constants
│   └── utils.ts         # Utility functions
└── public/              # Static assets
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Neon database (PostgreSQL)
- Vercel Blob storage

### Installation

1. Clone the repository:
```bash
git clone https://github.com/POORVANGIKA/website-layout-recreation.git
cd website-layout-recreation
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables in `.env.local`:
```env
DATABASE_URL=postgresql://user:password@host/database
BETTER_AUTH_SECRET=your_generated_secret_32_chars_minimum
BETTER_AUTH_URL=http://localhost:3000
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Database Schema

### User Table (Better Auth)
```sql
id (TEXT, PRIMARY KEY)
name (TEXT)
email (TEXT, UNIQUE)
emailVerified (BOOLEAN)
image (TEXT)
createdAt (TIMESTAMP)
updatedAt (TIMESTAMP)
```

### Court Analyses Table
```sql
id (TEXT, PRIMARY KEY)
userId (TEXT, FK to user)
videoUrl (TEXT)
videoFileName (TEXT)
analysisStatus (TEXT: 'processing' | 'completed' | 'failed')
analysisData (JSONB)
zoneData (JSONB)
heatmapData (JSONB)
topPlayerZoneCoverage (JSONB)
bottomPlayerZoneCoverage (JSONB)
processingStartedAt (TIMESTAMP)
processingCompletedAt (TIMESTAMP)
createdAt (TIMESTAMP)
updatedAt (TIMESTAMP)
```

## API Endpoints

### Authentication
- `POST /api/auth/signUp` - Create new account
- `POST /api/auth/signIn` - Login
- `POST /api/auth/signOut` - Logout
- `GET /api/auth/session` - Get current session

### Upload
- `POST /api/upload` - Upload video and create analysis

## Key Features

### Authentication
- Secure password hashing with Better Auth
- Session management with HTTP-only cookies
- Email verification (optional)

### Dashboard
- View all uploaded videos
- Real-time analysis status updates
- Delete or download analyses
- Sort and filter videos

### Profile
- View account information
- Update profile settings
- Sign out

## Constants & Configuration

Application settings in `lib/constants.ts`:
- `ANALYSIS_STATUS` - Video processing states
- `VIDEO_UPLOAD` - File size limits and formats
- `MESSAGES` - User notifications
- `API_ROUTES` - API endpoint paths

## Security

✅ User queries scoped to authenticated user
✅ File validation by MIME type and size
✅ Password hashing and session management
✅ Environment variables protected

## Development

### Run dev server
```bash
npm run dev
```

### Build for production
```bash
npm run build
npm start
```

### Lint code
```bash
npm run lint
```

## Deployment

### Deploy to Vercel
1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in project settings
4. Deploy automatically on push to main

## File Uploads & Storage

Videos are uploaded to Vercel Blob storage with:
- Automatic MIME type validation
- File size enforcement (max 100MB)
- Unique filename generation
- Secure URL generation

## Error Handling

- Error Boundary component wraps entire app
- API errors caught and displayed to users
- Server action errors logged for debugging
- Fallback UI for error states

## Recent Updates

- ✅ Added user profile and settings page
- ✅ Implemented error boundary for crash handling
- ✅ Added application constants file
- ✅ Dashboard with real database integration
- ✅ Improved navigation with profile links
- ✅ Delete functionality for analyses
- ✅ Status badges for video processing

## Contributing

1. Create feature branch: `git checkout -b feature/amazing-feature`
2. Commit changes: `git commit -m 'Add amazing feature'`
3. Push branch: `git push origin feature/amazing-feature`
4. Open Pull Request

## Learn More

- [Next.js Docs](https://nextjs.org/docs)
- [Better Auth Docs](https://better-auth.com)
- [Neon Docs](https://neon.tech/docs)
- [Vercel Blob Docs](https://vercel.com/docs/storage/vercel-blob)
