import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions): Promise<boolean> {
  if (!process.env.SMTP_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('📧 Missing env vars:');
    console.error('  SMTP_HOST:', process.env.SMTP_HOST || 'MISSING');
    console.error('  EMAIL_USER:', process.env.EMAIL_USER || 'MISSING');
    console.error('  EMAIL_PASS:', process.env.EMAIL_PASS ? 'SET' : 'MISSING');
    return false;
  }

  try {
    console.log('📧 Creating SMTP transporter...');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.verify();
    console.log('📧 SMTP connection verified!');

    const mailOptions = {
      from: `"HealthAI" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    };

    console.log('📧 Sending email: to=', to, ', subject=', subject);
    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Email sent! MessageId:', info.messageId);
    return true;
  } catch (error: unknown) {
    const emailError = error as { message?: string; code?: string };
    console.error('❌ Failed to send email:', emailError.message);
    if (emailError.code === 'EAUTH') {
      console.error('❌ AUTH ERROR: Invalid username/password.');
      console.error('💡 For Gmail, you MUST use an App Password (16 chars), NOT your regular password.');
      console.error('💡 Create one: https://myaccount.google.com/apppasswords');
    } else if (emailError.code === 'ECONNECTION') {
      console.error('❌ CONNECTION ERROR: Cannot reach SMTP server.');
      console.error('💡 Check SMTP_HOST and SMTP_PORT values.');
    } else if (emailError.code === 'ESOCKET') {
      console.error('❌ SOCKET ERROR: TLS/SSL issue.');
      console.error('💡 Try setting SMTP_PORT=465 and secure=true for port 465.');
    }
    return false;
  }
}

type ReportEmailTemplateOptions = {
  patientName: string;
  riskLevel: string;
  reportUrl: string;
  aiOverview: string;
  topFindings: string[];
  topActionPlan: string[];
  hospitalName: string;
};

export function generateReportEmailTemplate({
  patientName,
  riskLevel,
  reportUrl,
  aiOverview,
  topFindings,
  topActionPlan,
  hospitalName,
}: ReportEmailTemplateOptions): string {
  const normalizedRisk = riskLevel?.toLowerCase() || 'low';
  const background =
    normalizedRisk === 'high' ? '#fee2e2' : normalizedRisk === 'medium' ? '#fef3c7' : '#dcfce7';
  const text =
    normalizedRisk === 'high' ? '#dc2626' : normalizedRisk === 'medium' ? '#d97706' : '#16a34a';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background:#f4f4f5; font-family: Arial, sans-serif;">
  <div style="max-width:600px; margin:0 auto; background:#ffffff;">
    <div style="background: linear-gradient(135deg, #7c3aed, #3b82f6); padding: 40px 30px; text-align:center;">
      <h1 style="color:white; margin:0; font-size:24px;">🏥 HealthAI</h1>
      <p style="color:rgba(255,255,255,0.85); margin:10px 0 0;">Your Medical Report Analysis is Ready</p>
    </div>

    <div style="padding: 30px;">
      <p style="font-size:16px;">Dear <strong>${patientName}</strong>,</p>
      <p style="color:#555;">Your medical report has been successfully analyzed. Here are your results:</p>

      <div style="margin: 20px 0;">
        <span style="
          background: ${background};
          color: ${text};
          padding: 8px 20px;
          border-radius: 20px;
          font-weight: bold;
          font-size: 14px;
        ">
          Risk Level: ${riskLevel.toUpperCase()}
        </span>
      </div>

      <div style="background:#f8fafc; border-left: 4px solid #7c3aed; padding:15px; margin:20px 0; border-radius:4px;">
        <p style="margin:0; color:#374151; font-size:14px;">${aiOverview}</p>
      </div>

      <h3 style="color:#111827; font-size:16px;">Key Findings:</h3>
      <ul style="color:#555; font-size:14px; line-height:1.8;">
        ${topFindings.map((finding) => `<li>${finding}</li>`).join('')}
      </ul>

      <h3 style="color:#111827; font-size:16px;">Next Steps:</h3>
      <ul style="color:#555; font-size:14px; line-height:1.8;">
        ${topActionPlan.map((step) => `<li>${step}</li>`).join('')}
      </ul>

      <div style="text-align:center; margin:30px 0;">
        <a href="${reportUrl}" 
           style="background: linear-gradient(135deg, #7c3aed, #3b82f6); 
                  color:white; 
                  padding:14px 32px; 
                  border-radius:8px; 
                  text-decoration:none; 
                  font-weight:bold;
                  font-size:15px;">
          View Full Report Online
        </a>
      </div>

      <p style="color:#888; font-size:13px;">
        You can also download your original PDF report from your dashboard.
      </p>
    </div>

    <div style="background:#f9fafb; border-top:1px solid #e5e7eb; padding:20px 30px; text-align:center;">
      <p style="color:#9ca3af; font-size:12px; margin:0;">
        ${hospitalName} • Powered by HealthAI
      </p>
      <p style="color:#9ca3af; font-size:11px; margin:8px 0 0;">
        This report is for informational purposes only and does not constitute medical advice.
      </p>
      <p style="color:#9ca3af; font-size:11px; margin:4px 0 0;">
        You received this because a report was submitted for your email address.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
