import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Patient from '@/models/Patient';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const hospitalId = session.user.id;

    // Get total patients
    const totalPatients = await Patient.countDocuments({ hospitalId });

    // Get completed reports (patients with reportUrl)
    const completedReports = await Patient.countDocuments({ 
      hospitalId, 
      reportUrl: { $exists: true, $ne: null } 
    });

    // Get high risk patients
    const highRiskPatients = await Patient.countDocuments({ 
      hospitalId, 
      riskLevel: 'High' 
    });

    // Get patients added this month
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    
    const thisMonthPatients = await Patient.countDocuments({
      hospitalId,
      createdAt: { $gte: thisMonth }
    });

    return NextResponse.json({
      totalPatients,
      completedReports,
      highRiskPatients,
      thisMonthPatients,
    });
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
