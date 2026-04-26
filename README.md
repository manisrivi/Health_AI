# Healthcare AI Report System

A multi-tenant SaaS web application for hospitals and diagnostic labs to manage patient reports with AI-powered analysis.

## Features

- **Multi-tenant Authentication**: Secure login for hospitals/labs with data isolation
- **Patient Management**: Add, view, edit, and delete patients
- **AI Report Analysis**: Upload PDF reports, extract text, and generate AI summaries using Gemini AI
- **Public Reports**: Secure public links for patients to view AI-generated reports
- **Email Notifications**: Automatic email sending to patients after AI processing
- **File Upload**: Cloudinary integration for secure PDF storage

## Tech Stack

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, MongoDB, Mongoose
- **Authentication**: NextAuth.js with JWT
- **AI**: Google Gemini AI API
- **File Storage**: Cloudinary
- **Email**: Nodemailer
- **PDF Processing**: pdf-parse (demo with dummy text)

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables in `.env.local`:
   ```
   MONGODB_URI=your_mongodb_connection_string
   NEXTAUTH_SECRET=your_nextauth_secret
   NEXTAUTH_URL=http://localhost:3000
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   GEMINI_API_KEY=your_gemini_api_key
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   ```
4. Start MongoDB locally or use a cloud service like MongoDB Atlas
5. Run the development server:
   ```bash
   npm run dev
   ```
6. Open [http://localhost:3000](http://localhost:3000)

## Usage

1. Sign up as a hospital/lab
2. Add patients with their details
3. Upload PDF medical reports for AI analysis
4. View AI-generated summaries, risk levels, issues, and recommendations
5. Patients receive email with public report link

## Deployment

This project is ready for Vercel deployment. Make sure to set environment variables in Vercel dashboard.

## Project Structure

- `/app` - Next.js app routes and API
- `/components` - React components
- `/lib` - Utility functions (DB, auth, etc.)
- `/models` - Mongoose schemas
- `/types` - TypeScript type definitions

## License

MIT
