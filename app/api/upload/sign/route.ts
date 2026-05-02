import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { v2 as cloudinary } from 'cloudinary';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Patient from '@/models/Patient';

export const runtime = 'nodejs';

const MAX_UPLOAD_FILE_SIZE_MB = 20;
const MAX_UPLOAD_FILE_SIZE_BYTES = MAX_UPLOAD_FILE_SIZE_MB * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { patientId, fileSize, fileType } = await req.json();

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }
    if (fileType !== 'application/pdf') {
      return NextResponse.json({ error: 'Please upload a PDF file only' }, { status: 400 });
    }
    if (typeof fileSize !== 'number' || fileSize > MAX_UPLOAD_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: `File size must be less than ${MAX_UPLOAD_FILE_SIZE_MB}MB` }, { status: 400 });
    }

    await dbConnect();

    const patient = await Patient.findOne({ _id: patientId, hospitalId: session.user.id }).select('_id');
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ error: 'Cloudinary is not configured' }, { status: 500 });
    }

    const timestamp = Math.round(Date.now() / 1000);
    const publicId = `reports/${patientId}.pdf`;
    const uploadParams = {
      overwrite: true,
      public_id: publicId,
      timestamp,
    };

    const signature = cloudinary.utils.api_sign_request(uploadParams, apiSecret);

    return NextResponse.json({
      apiKey,
      publicId,
      signature,
      timestamp,
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`,
    });
  } catch (error) {
    console.error('Cloudinary sign error:', error);
    return NextResponse.json({ error: 'Unable to prepare upload' }, { status: 500 });
  }
}
