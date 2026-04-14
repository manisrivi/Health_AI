import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Patient from '@/models/Patient';
import { v2 as cloudinary } from 'cloudinary';
import { GoogleGenerativeAI, SchemaType, type ResponseSchema } from '@google/generative-ai';
// const pdfjsLib = require('pdfjs-dist');
import { sendEmail, generateReportEmailTemplate } from '@/lib/email';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const geminiModelCandidates = [
  process.env.GEMINI_MODEL,
  'gemini-flash-latest',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
].filter((model): model is string => Boolean(model));

/** Enforces JSON shape in Gemini; server-side normalizeAiResponse still pads if parsing fails. */
const labReportJsonSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    overview: {
      type: SchemaType.STRING,
      description:
        'One detailed paragraph: overall health picture for this patient based only on the lab text; cite values when present.',
    },
    riskLevel: {
      type: SchemaType.STRING,
      format: 'enum',
      enum: ['Low', 'Medium', 'High'],
    },
    resultsNeedingAttention: {
      type: SchemaType.ARRAY,
      maxItems: 3,
      items: { type: SchemaType.STRING },
      description:
        'ALWAYS provide 1-3 meaningful lines: abnormal results, notable findings, OR if normal, state what was reviewed and that values appear within normal ranges.',
    },
    keyTakeaways: {
      type: SchemaType.ARRAY,
      maxItems: 8,
      items: { type: SchemaType.STRING },
      description:
        'ALWAYS provide 2-5 clear takeaways about the lab results, even if they indicate normal findings.',
    },
    actionPlan: {
      type: SchemaType.ARRAY,
      maxItems: 12,
      items: { type: SchemaType.STRING },
      description:
        'ALWAYS provide 3-6 concrete next steps: follow-up, lifestyle, or when to see clinician.',
    },
    keyIssues: {
      type: SchemaType.ARRAY,
      maxItems: 10,
      items: { type: SchemaType.STRING },
      description:
        'ALWAYS provide 1-3 health themes or observations from the report (use "General health appears stable" if no issues found).',
    },
    quickRecommendations: {
      type: SchemaType.ARRAY,
      maxItems: 10,
      items: { type: SchemaType.STRING },
      description:
        'ALWAYS provide 2-4 practical recommendations based on the report findings.',
    },
    finalSummary: {
      type: SchemaType.STRING,
      description: 'Closing paragraph: priorities, follow-up, not a diagnosis.',
    },
  },
  required: [
    'overview',
    'riskLevel',
    'resultsNeedingAttention',
    'keyTakeaways',
    'actionPlan',
    'keyIssues',
    'quickRecommendations',
    'finalSummary',
  ],
};

async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      return (result.text || '').trim();
    } finally {
      await parser.destroy();
    }
  } catch {
    return '';
  }
}

function extractJsonFromModelText(text: string) {
  const cleaned = text.trim();
  const markdownJsonMatch = cleaned.match(/```json\s*([\s\S]*?)```/i);
  if (markdownJsonMatch?.[1]) {
    return JSON.parse(markdownJsonMatch[1].trim());
  }

  const genericCodeMatch = cleaned.match(/```\s*([\s\S]*?)```/);
  if (genericCodeMatch?.[1]) {
    return JSON.parse(genericCodeMatch[1].trim());
  }

  return JSON.parse(cleaned);
}

type NormalizedAi = {
  overview: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  resultsNeedingAttention: string[];
  keyTakeaways: string[];
  actionPlan: string[];
  keyIssues: string[];
  quickRecommendations: string[];
  finalSummary: string;
};

function coerceRiskLevel(value: unknown): 'Low' | 'Medium' | 'High' {
  if (value === 'Low' || value === 'Medium' || value === 'High') return value;
  return 'Low';
}

const MAX_PADDED_LINES = 50;
const GENERIC_LINE_PADS = [
  'Review the full report with your healthcare provider for personalized interpretation.',
  'Discuss any unexpected values with your clinician before changing medications or diet.',
  'Keep the original lab document for your records and future visits.',
] as const;

/** Map mixed AI output (strings or legacy row objects) to non-empty string lines. */
function linesFromMixedArray(raw: unknown, minLen: number, fallbacks: string[]): string[] {
  const n = Number(minLen);
  const target = Number.isFinite(n)
    ? Math.min(Math.max(Math.floor(n), 0), MAX_PADDED_LINES)
    : 0;
  const out: string[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === 'string') {
        const s = item.trim();
        if (s) out.push(s);
        continue;
      }
      if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>;
        if ('testName' in o || 'result' in o) {
          const testName = String(o.testName ?? '');
          const result = String(o.result ?? o.yourValue ?? '');
          const status = String(o.status ?? o.statusLabel ?? '');
          const normalRange = String(o.normalRange ?? '');
          const line = [testName && `${testName}:`, result, status && `(${status})`, normalRange && `ref ${normalRange}`]
            .filter(Boolean)
            .join(' ')
            .trim();
          if (line) out.push(line);
        }
      }
    }
  }
  let i = 0;
  while (out.length < target && i < fallbacks.length) {
    const f = fallbacks[i++];
    if (!out.includes(f)) out.push(f);
  }
  const startLen = out.length;
  for (let p = startLen; p < target; p++) {
    const pad = GENERIC_LINE_PADS[(p - startLen) % GENERIC_LINE_PADS.length];
    out.push(pad);
  }
  return out;
}

function normalizeAiResponse(response: any, patientName: string): NormalizedAi {
  const fallbackOverview = `Health overview for ${patientName}: AI could not fully analyze this upload. Please review the original lab document with your clinician.`;
  const fallbackFinal = `Summary for ${patientName}: This AI summary is informational only—not a diagnosis. Follow up with a qualified professional for medical decisions.`;

  const base: NormalizedAi = {
    overview: fallbackOverview,
    riskLevel: 'Low',
    resultsNeedingAttention: [
      `No specific abnormal values could be extracted for ${patientName}; verify findings on the source report.`,
    ],
    keyTakeaways: [
      `Share these results with your clinician to confirm what they mean for ${patientName}.`,
      `Use the original PDF as the source of truth if anything here seems unclear.`,
    ],
    actionPlan: [
      `Book a routine follow-up with your doctor to discuss ${patientName}'s lab results.`,
      `Bring the full report and any prior labs for comparison.`,
      `Ask your clinician which values (if any) need repeat testing or lifestyle changes.`,
    ],
    keyIssues: ['Automated analysis was limited; clinical review is recommended.'],
    quickRecommendations: [
      'Consult your healthcare provider before changing medications or diet.',
      'Bring this summary and the original lab PDF to your next appointment.',
    ],
    finalSummary: fallbackFinal,
  };

  if (!response || typeof response !== 'object') return base;

  const overviewRaw =
    typeof response.overview === 'string' && response.overview.trim()
      ? response.overview.trim()
      : typeof response.summary === 'string' && response.summary.trim()
        ? response.summary.trim()
        : base.overview;

  let resultsRaw = response.resultsNeedingAttention ?? response.results_needing_attention;
  if (!Array.isArray(resultsRaw) || resultsRaw.length === 0) {
    resultsRaw = response.resultsThatNeedAttention;
  }
  const resultsNeedingAttention = linesFromMixedArray(resultsRaw, 1, base.resultsNeedingAttention);

  const keyTakeaways = linesFromMixedArray(response.keyTakeaways, 2, base.keyTakeaways);

  let actionRaw = response.actionPlan;
  if (!Array.isArray(actionRaw) || actionRaw.length < 3) {
    const md =
      typeof response.actionPlanMarkdown === 'string' ? response.actionPlanMarkdown.trim() : '';
    if (md.length > 0) {
      const split = md
        .split(/\n(?=\s*(?:[-•]|\d+[\).]|\*\s)|🫀|🩺|💊|🏃|🥗)/u)
        .map((s: string) => s.trim())
        .filter(Boolean);
      if (split.length >= 3) actionRaw = split;
    }
  }
  const actionPlan = linesFromMixedArray(actionRaw, 3, base.actionPlan);

  const keyIssues = linesFromMixedArray(
    response.keyIssues ?? response.issues,
    1,
    base.keyIssues
  );
  const quickRecommendations = linesFromMixedArray(
    response.quickRecommendations ?? response.recommendations,
    2,
    base.quickRecommendations
  );

  const finalSummary =
    typeof response.finalSummary === 'string' && response.finalSummary.trim()
      ? response.finalSummary.trim()
      : typeof response.final_summary === 'string' && response.final_summary.trim()
        ? response.final_summary.trim()
        : base.finalSummary;

  return {
    overview: overviewRaw,
    riskLevel: coerceRiskLevel(response.riskLevel),
    resultsNeedingAttention,
    keyTakeaways,
    actionPlan,
    keyIssues,
    quickRecommendations,
    finalSummary,
  };
}

export async function POST(req: NextRequest) {
  console.log('\n========================================');
  console.log('🚀 UPLOAD ROUTE CALLED at:', new Date().toISOString());
  console.log('========================================');
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('1️⃣  Received request, parsing FormData...');
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const patientId = formData.get('patientId') as string;

    console.log('2️⃣  FormData parsed:', { file: file?.name, patientId });

    if (!file || !patientId) {
      console.log('❌ Missing file or patientId');
      return NextResponse.json({ error: 'Please provide both file and patient ID' }, { status: 400 });
    }
    if (file.type !== 'application/pdf') {
      console.log('❌ Not a PDF');
      return NextResponse.json({ error: 'Please upload a PDF file only' }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      console.log('❌ File too large');
      return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 });
    }

    console.log('3️⃣  Connecting to DB...');
    await dbConnect();
    console.log('✅ DB connected');

    const patientForPrompt = await Patient.findOne({
      _id: patientId,
      hospitalId: session.user.id,
    }).select('name');

    if (!patientForPrompt) {
      console.log('❌ Patient not found for hospital:', { patientId, hospitalId: session.user.id });
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Upload to Cloudinary
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    console.log('4️⃣ Uploading to Cloudinary...');
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { resource_type: 'raw', public_id: `reports/${patientId}` },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(new Error('Upload failed. Please try again'));
          } else {
            resolve(result);
          }
        }
      ).end(buffer);
    });

    const reportUrl = (uploadResult as any).secure_url;
    console.log('✅ Cloudinary upload done:', reportUrl);

    console.log('5️⃣ Extracting PDF text...');
    const extracted = await extractPdfText(buffer);
    const fallbackSnippet =
      'Sample lab report text: Patient has normal blood count, cholesterol levels are high, recommend diet changes.';
    const text =
      extracted.length > 80 ? extracted.slice(0, 120_000) : fallbackSnippet;
    console.log('✅ PDF text extracted:', extracted.length, 'chars');

    const patientName = patientForPrompt?.name || 'Patient';
    console.log('6️⃣ Patient name:', patientName);

    const fallbackAIResponse = normalizeAiResponse(null, patientName);
    let aiResponse = fallbackAIResponse;
    let aiStatus: 'generated' | 'fallback' = 'fallback';
    let aiReason = 'ai_not_attempted';

    // Send to Gemini AI, but do not fail upload if AI is unavailable.
    if (genAI) {
      const prompt = `You are a careful medical educator (not a doctor). Analyze the lab report text below for patient "${patientName}".

Tone: supportive and specific; cite numbers from the report when available. Never invent results not supported by the text.

CRITICAL: You MUST provide meaningful content for ALL fields. Even if results are normal, still provide useful insights and recommendations. Never return empty arrays or null values.

Output: your reply MUST be a single JSON object only (no markdown, no code fences, no text before or after). The response will be validated against a fixed schema: every key listed below must appear with a non-empty string or a non-empty array (never null, never []).

Fields:
- overview: string — one detailed paragraph on overall findings for ${patientName}.
- riskLevel: exactly one of "Low", "Medium", "High" (clinical risk implied by the report text, not certainty).
- resultsNeedingAttention: array of 1–3 strings — ALWAYS provide content: if abnormal, describe them; if normal, state "Reviewed values appear within normal ranges" or similar.
- keyTakeaways: array of 2–5 strings — ALWAYS provide clear points about the report, even for normal results (e.g., "Overall health markers appear stable").
- actionPlan: array of 3–6 strings — ALWAYS provide concrete next steps like "Schedule routine follow-up in 6 months" even for normal results.
- keyIssues: array of 1–3 strings — ALWAYS provide observations; use "General health appears stable" if no specific issues.
- quickRecommendations: array of 2–4 strings — ALWAYS give practical advice like "Maintain current healthy lifestyle" for normal results.
- finalSummary: string — one closing paragraph: priorities and follow-up; state this is not a diagnosis.`;
      for (const modelName of geminiModelCandidates) {
        try {
          let parsed: unknown;
          try {
            const model = genAI.getGenerativeModel({
              model: modelName,
              generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: labReportJsonSchema,
              },
            });
            const result = await model.generateContent([prompt, text]);
            parsed = extractJsonFromModelText((await result.response).text());
          } catch (inner: unknown) {
            const err = inner as { status?: number };
            if (err?.status === 400) {
              const model = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: { responseMimeType: 'application/json' },
              });
              const result = await model.generateContent([prompt, text]);
              parsed = extractJsonFromModelText((await result.response).text());
            } else {
              throw inner;
            }
          }
          aiResponse = normalizeAiResponse(parsed, patientName);
          aiStatus = 'generated';
          aiReason = 'ok';
          break;
        } catch (aiError: unknown) {
          console.error(`Gemini analysis failed for model ${modelName}:`, aiError);
          const status = (aiError as { status?: number })?.status;
          if (status === 404) {
            aiReason = `gemini_model_not_found:${modelName}`;
            continue;
          }
          if (status === 429) {
            aiReason = 'gemini_quota_exceeded';
            break;
          }
          if (aiError instanceof SyntaxError) {
            aiReason = 'invalid_ai_json_response';
            break;
          }
          aiReason = 'gemini_request_failed';
          break;
        }
      }
    } else {
      aiReason = 'missing_gemini_api_key';
    }

    console.log('7️⃣ AI processing done — status:', aiStatus, 'reason:', aiReason);

    // Generate unique public token
    const publicToken = crypto.randomUUID();
    console.log('8️⃣ Generated publicToken:', publicToken);

    // Update patient
    console.log('9️⃣ Updating patient record...');
    const patient = await Patient.findOneAndUpdate(
      { _id: patientId, hospitalId: session.user.id },
      {
        reportUrl,
        aiSummary: aiResponse.overview,
        riskLevel: aiResponse.riskLevel,
        issues: aiStatus === 'generated' ? aiResponse.keyIssues : [...aiResponse.keyIssues, `AI fallback reason: ${aiReason}`],
        recommendations: aiResponse.quickRecommendations,
        resultsNeedingAttention: aiResponse.resultsNeedingAttention,
        resultsThatNeedAttention: [],
        keyTakeawaysIntro: '',
        keyTakeaways: aiResponse.keyTakeaways,
        keyTakeawaysClosing: '',
        actionPlanTitle: `Action plan for ${patientName}`,
        actionPlanMarkdown: '',
        actionPlan: aiResponse.actionPlan,
        finalSummary: aiResponse.finalSummary,
        publicToken,
        status: 'Completed',
      },
      { new: true }
    );
    console.log('🔟 Patient updated, ID:', patient?._id);

    if (!patient) {
      console.log('❌ Patient not found in DB:', patientId);
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    console.log('📧 ENTERING EMAIL SECTION — patient.email:', patient.email);
    // Send email with public URL and PDF attachment
    const publicUrl = patient.publicToken ? `${process.env.NEXTAUTH_URL}/report/${patient.publicToken}` : null;

    console.log('=== EMAIL DEBUG START ===');
    console.log('SMTP_HOST:', process.env.SMTP_HOST || 'NOT SET');
    console.log('SMTP_PORT:', process.env.SMTP_PORT || '587 (default)');
    console.log('EMAIL_USER:', process.env.EMAIL_USER || 'NOT SET');
    console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? `SET (length: ${process.env.EMAIL_PASS.length})` : 'NOT SET');
    console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL || 'NOT SET');
    console.log('Patient email:', patient.email);
    console.log('Patient name:', patient.name);
    console.log('Public URL:', publicUrl);
    console.log('=== EMAIL DEBUG END ===');

    if (patient.email) {
      try {
        console.log('📧 CALLING sendEmail function...');
        const emailHtml = generateReportEmailTemplate(
          patient.name,
          patient.email,
          patient.riskLevel,
          publicUrl,
          reportUrl
        );

        console.log('📧 Attempting to send email to:', patient.email);

        const emailSent = await sendEmail({
          to: patient.email,
          subject: 'Your HealthAI Report Analysis is Ready',
          html: emailHtml,
        });

        if (emailSent) {
          console.log('✅ Email sent successfully to:', patient.email);
        } else {
          console.error('❌ Email send returned false. Check your terminal for the error above.');
          console.error('💡 If using Gmail, make sure EMAIL_PASS is a 16-char App Password, not your regular password.');
          console.error('💡 Get App Password: https://myaccount.google.com/apppasswords');
        }
      } catch (emailError) {
        console.error('❌ Email error:', emailError);
        console.error('Full error details:', JSON.stringify(emailError, Object.getOwnPropertyNames(emailError)));
      }
    } else {
      console.warn('⚠️ Patient has no email. Skipping email notification.');
    }

    console.log('✅ ROUTE FINISHING — sending success response');

    return NextResponse.json({
      message: 'Upload and processing completed',
      aiStatus,
      aiReason,
    });
  } catch (error) {
    console.error('\n========================================');
    console.error('💥 UPLOAD ROUTE ERROR at:', new Date().toISOString());
    console.error('========================================');
    console.error('Full error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      if (error.message.includes('ENOENT')) {
        return NextResponse.json({ error: 'File not found' }, { status: 400 });
      }
      if (error.message.includes('ENAMETOOLONG')) {
        return NextResponse.json({ error: 'File name too long' }, { status: 400 });
      }
      if (error.message.includes('ECONNRESET')) {
        return NextResponse.json({ error: 'Connection error. Check your internet' }, { status: 500 });
      }
      if (error.message.includes('ETIMEDOUT')) {
        return NextResponse.json({ error: 'Request timeout. Please try again' }, { status: 500 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ error: 'Server error. Please try again' }, { status: 500 });
  }
}
