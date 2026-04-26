import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Patient from '@/models/Patient';

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  
  try {
    await dbConnect();

    const patient = await Patient.findOne({ 
      publicToken: token,
      status: 'Completed'
    });

    if (!patient) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Return patient data (excluding sensitive internal fields)
    const publicData = {
      _id: patient._id,
      name: patient.name,
      phone: patient.phone,
      email: patient.email,
      age: patient.age,
      gender: patient.gender,
      reportUrl: patient.reportUrl,
      aiSummary: patient.aiSummary,
      riskLevel: patient.riskLevel,
      issues: patient.issues,
      recommendations: patient.recommendations,
      resultsNeedingAttention: patient.resultsNeedingAttention,
      resultsThatNeedAttention: patient.resultsThatNeedAttention,
      keyTakeawaysIntro: patient.keyTakeawaysIntro,
      keyTakeaways: patient.keyTakeaways,
      keyTakeawaysClosing: patient.keyTakeawaysClosing,
      actionPlanTitle: patient.actionPlanTitle,
      actionPlanMarkdown: patient.actionPlanMarkdown,
      actionPlan: patient.actionPlan,
      finalSummary: patient.finalSummary,
      status: patient.status,
      createdAt: patient.createdAt,
    };

    return NextResponse.json(publicData);
  } catch (error) {
    console.error('Public report API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
