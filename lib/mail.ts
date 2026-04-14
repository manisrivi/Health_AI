import nodemailer from "nodemailer";

export async function sendReportEmail(to: string, publicToken: string) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const reportLink = `${process.env.NEXT_PUBLIC_BASE_URL}/report/${publicToken}`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject: "Your Health Report is Ready 🏥",
      html: `
        <h2>Your Health Report is Ready</h2>
        <p>Click below to view your AI-generated report:</p>
        <a href="${reportLink}" target="_blank">View Report</a>
        <br/><br/>
        <small>This is AI-generated. Please consult a doctor.</small>
      `,
    });

    console.log("Email sent successfully");
  } catch (error) {
    console.error("Email error:", error);
  }
}
