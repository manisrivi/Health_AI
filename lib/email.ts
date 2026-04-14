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
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Verify SMTP connection
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
  } catch (error: any) {
    console.error('❌ Failed to send email:', error.message);
    if (error.code === 'EAUTH') {
      console.error('❌ AUTH ERROR: Invalid username/password.');
      console.error('💡 For Gmail, you MUST use an App Password (16 chars), NOT your regular password.');
      console.error('💡 Create one: https://myaccount.google.com/apppasswords');
    } else if (error.code === 'ECONNECTION') {
      console.error('❌ CONNECTION ERROR: Cannot reach SMTP server.');
      console.error('💡 Check SMTP_HOST and SMTP_PORT values.');
    } else if (error.code === 'ESOCKET') {
      console.error('❌ SOCKET ERROR: TLS/SSL issue.');
      console.error('💡 Try setting SMTP_PORT=465 and secure=true for port 465.');
    }
    return false;
  }
}

export function generateReportEmailTemplate(
  patientName: string,
  patientEmail: string,
  riskLevel: string,
  publicUrl: string,
  originalPdfUrl?: string
): string {
  const getRiskColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'low':
        return '#10b981'; // green
      case 'medium':
        return '#f59e0b'; // yellow
      case 'high':
        return '#ef4444'; // red
      default:
        return '#6b7280'; // gray
    }
  };

  const riskColor = getRiskColor(riskLevel);

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HealthAI Report Analysis</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .content {
            background: white;
            padding: 30px;
            border-radius: 0 0 10px 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .risk-badge {
            display: inline-block;
            padding: 8px 16px;
            background: ${riskColor};
            color: white;
            border-radius: 20px;
            font-weight: bold;
            margin: 20px 0;
        }
        .button {
            display: inline-block;
            padding: 12px 24px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            margin: 20px 10px 20px 0;
        }
        .footer {
            text-align: center;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 0 0 10px 10px;
            font-size: 14px;
            color: #6b7280;
        }
        .disclaimer {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">⚕ HealthAI</div>
        <h1>Your Medical Report Analysis is Ready</h1>
    </div>

    <div class="content">
        <p>Dear <strong>${patientName}</strong>,</p>
        <p>Your medical report has been successfully analyzed by our AI system. Here are your results:</p>
        
        <div class="risk-badge">
            Risk Level: ${riskLevel?.toUpperCase() || 'UNKNOWN'}
        </div>

        <p><strong>What This Means:</strong> ${
          riskLevel?.toLowerCase() === 'low' ? 'Your results are within normal ranges.' :
          riskLevel?.toLowerCase() === 'medium' ? 'Some values may need attention.' :
          riskLevel?.toLowerCase() === 'high' ? 'Immediate medical consultation recommended.' :
          'Risk level assessment not available.'
        }</p>

        <div style="margin: 30px 0;">
            <a href="${publicUrl}" class="button">View Full Report Online</a>
        </div>

        ${originalPdfUrl ? `
        <p><strong>Original Report:</strong> You can also download your original PDF report from your dashboard.</p>
        ` : ''}
    </div>

    <div class="footer">
        <div class="disclaimer">
            <strong>⚠️ Important Disclaimer:</strong><br>
            This is AI-generated medical report analysis. While we strive for accuracy, 
            this analysis should not replace professional medical advice. Always consult 
            with a qualified healthcare professional for medical decisions and treatment.
        </div>
        <p>&copy; 2026 HealthAI. All rights reserved.</p>
    </div>
</body>
</html>
  `.trim();
}
