import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Patient from '@/models/Patient';
import User from '@/models/User';
import { v2 as cloudinary } from 'cloudinary';
// const pdfjsLib = require('pdfjs-dist');
import { sendEmail, generateReportEmailTemplate } from '@/lib/email';

export const runtime = 'nodejs';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const geminiApiKey = process.env.GEMINI_API_KEY?.trim() || '';
const geminiModelCandidates = [
  process.env.GEMINI_MODEL,
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
].filter((model): model is string => Boolean(model)).filter((model, index, all) => all.indexOf(model) === index);

const labReportJsonSchema = {
  type: 'object',
  properties: {
    riskLevel: {
      type: 'string',
      enum: ['low', 'medium', 'high'],
    },
    overview: {
      type: 'string',
      description:
        '2-3 sentence summary mentioning specific values found in the report.',
    },
    resultsNeedingAttention: {
      type: 'array',
      maxItems: 5,
      items: {
        type: 'object',
        properties: {
          finding: { type: 'string' },
          severity: {
            type: 'string',
            enum: ['high', 'medium', 'normal'],
          },
          explanation: { type: 'string' },
        },
        required: ['finding', 'severity', 'explanation'],
      },
      description:
        'List of report findings with exact values and a short explanation.',
    },
    keyTakeaways: {
      type: 'array',
      maxItems: 8,
      items: { type: 'string' },
      description: 'Specific takeaways with actual numbers where possible.',
    },
    actionPlan: {
      type: 'array',
      maxItems: 12,
      items: { type: 'string' },
      description: 'Specific actionable next steps.',
    },
    keyIssues: {
      type: 'array',
      maxItems: 10,
      items: {
        type: 'object',
        properties: {
          issue: { type: 'string' },
          severity: {
            type: 'string',
            enum: ['critical', 'moderate', 'minor'],
          },
        },
        required: ['issue', 'severity'],
      },
      description: 'Specific issues with a severity level.',
    },
    recommendations: {
      type: 'array',
      maxItems: 10,
      items: { type: 'string' },
      description: 'Specific practical recommendations.',
    },
    finalSummary: {
      type: 'string',
      description: '2-3 sentence conclusion with specific values and clear next steps.',
    },
  },
  required: [
    'riskLevel',
    'overview',
    'resultsNeedingAttention',
    'keyTakeaways',
    'actionPlan',
    'keyIssues',
    'recommendations',
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

function extractGeminiText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const candidate = Array.isArray((payload as { candidates?: unknown[] }).candidates)
    ? (payload as { candidates: Array<{ content?: { parts?: Array<{ text?: string }> } }> }).candidates[0]
    : undefined;
  const parts = candidate?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .join('\n')
    .trim();
}

function extractGeminiErrorMessage(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const error = (payload as { error?: { message?: unknown } }).error;
  return typeof error?.message === 'string' ? error.message : '';
}

async function generateGeminiJson({
  modelName,
  prompt,
  base64PdfData,
  extractedText,
  useSchema,
}: {
  modelName: string;
  prompt: string;
  base64PdfData: string;
  extractedText: string;
  useSchema: boolean;
}) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent`;
  const generationConfig = useSchema
    ? {
        responseMimeType: 'application/json',
        responseJsonSchema: labReportJsonSchema,
      }
    : {
        responseMimeType: 'application/json',
      };

  const requestBodies = [
    {
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: 'application/pdf',
                data: base64PdfData,
              },
            },
            { text: prompt },
          ],
        },
      ],
      generationConfig,
    },
  ];

  if (extractedText.trim()) {
    requestBodies.push({
      contents: [
        {
          parts: [
            {
              text: `${prompt}\n\nExtracted report text:\n${extractedText.slice(0, 120000)}`,
            },
          ],
        },
      ],
      generationConfig,
    });
  }

  let lastError: Error | null = null;

  for (const body of requestBodies) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': geminiApiKey,
      },
      body: JSON.stringify(body),
    });

    const payload = (await response.json().catch(() => null)) as unknown;

    if (!response.ok) {
      const error = new Error(
        extractGeminiErrorMessage(payload) || `Gemini request failed with status ${response.status}`
      ) as Error & { status?: number };
      error.status = response.status;
      lastError = error;
      continue;
    }

    const text = extractGeminiText(payload);
    if (!text) {
      const error = new Error('Gemini returned no text content') as Error & { status?: number };
      error.status = 502;
      lastError = error;
      continue;
    }

    return extractJsonFromModelText(text);
  }

  throw lastError ?? new Error('Gemini request failed');
}

function getGeminiFailureReason(error: unknown, modelName: string) {
  const status = (error as { status?: number })?.status;
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  if (status === 401 || status === 403) {
    if (message.includes('leaked')) return 'gemini_api_key_leaked_or_disabled';
    if (message.includes('api key')) return 'gemini_api_key_invalid_or_restricted';
    return 'gemini_permission_denied';
  }
  if (status === 404) return `gemini_model_not_found:${modelName}`;
  if (status === 429) return 'gemini_quota_exceeded';
  if (error instanceof SyntaxError) return 'invalid_ai_json_response';
  return 'gemini_request_failed';
}

function extractTopText(value: string | undefined, maxLength = 220) {
  if (!value) return '';
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength).trim()}...` : trimmed;
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
  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    if (normalized === 'low') return 'Low';
    if (normalized === 'medium') return 'Medium';
    if (normalized === 'high') return 'High';
  }
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
        if ('finding' in o || 'severity' in o || 'explanation' in o) {
          const finding = String(o.finding ?? '').trim();
          const severity = String(o.severity ?? '').trim();
          const explanation = String(o.explanation ?? '').trim();
          const line = [finding, severity && `(${severity})`, explanation].filter(Boolean).join(' — ').trim();
          if (line) out.push(line);
          continue;
        }
        if ('issue' in o || 'severity' in o) {
          const issue = String(o.issue ?? '').trim();
          const severity = String(o.severity ?? '').trim();
          const line = [severity && `${severity}:`, issue].filter(Boolean).join(' ').trim();
          if (line) out.push(line);
          continue;
        }
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

function normalizeAiResponse(response: unknown, patientName: string): NormalizedAi {
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
  const ai = response as Record<string, unknown>;

  const overviewRaw =
    typeof ai.overview === 'string' && ai.overview.trim()
      ? ai.overview.trim()
      : typeof ai.summary === 'string' && ai.summary.trim()
        ? ai.summary.trim()
        : base.overview;

  let resultsRaw = ai.resultsNeedingAttention ?? ai.results_needing_attention;
  if (!Array.isArray(resultsRaw) || resultsRaw.length === 0) {
    resultsRaw = ai.resultsThatNeedAttention;
  }
  const resultsNeedingAttention = linesFromMixedArray(resultsRaw, 1, base.resultsNeedingAttention);

  const keyTakeaways = linesFromMixedArray(ai.keyTakeaways, 2, base.keyTakeaways);

  let actionRaw = ai.actionPlan;
  if (!Array.isArray(actionRaw) || actionRaw.length < 3) {
    const md =
      typeof ai.actionPlanMarkdown === 'string' ? ai.actionPlanMarkdown.trim() : '';
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
    ai.keyIssues ?? ai.issues,
    1,
    base.keyIssues
  );
  const quickRecommendations = linesFromMixedArray(
    ai.quickRecommendations ?? ai.recommendations,
    2,
    base.quickRecommendations
  );

  const finalSummary =
    typeof ai.finalSummary === 'string' && ai.finalSummary.trim()
      ? ai.finalSummary.trim()
      : typeof ai.final_summary === 'string' && ai.final_summary.trim()
        ? ai.final_summary.trim()
        : base.finalSummary;

  return {
    overview: overviewRaw,
    riskLevel: coerceRiskLevel(ai.riskLevel),
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
    const uploader = await User.findById(session.user.id).select('hospitalName name');

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

    const reportUrl = (uploadResult as { secure_url?: string }).secure_url;
    console.log('✅ Cloudinary upload done:', reportUrl);

    console.log('5️⃣ Extracting PDF text...');
    const extracted = await extractPdfText(buffer);
    console.log('✅ PDF text extracted:', extracted.length, 'chars');

    const patientName = patientForPrompt?.name || 'Patient';
    console.log('6️⃣ Patient name:', patientName);

    const fallbackAIResponse = normalizeAiResponse(null, patientName);
    let aiResponse = fallbackAIResponse;
    let aiStatus: 'generated' | 'fallback' = 'fallback';
    let aiReason = 'ai_not_attempted';

    const analysisPrompt = `
You are a clinical report analyzer. Analyze this medical report and return structured JSON.

Extract ACTUAL values and numbers from the report — do not generalize.

Return ONLY valid JSON, no markdown, no backticks, just raw JSON:
{
  "riskLevel": "low" | "medium" | "high",
  "overview": "2-3 sentence summary mentioning specific values found",
  "resultsNeedingAttention": [
    {
      "finding": "e.g. Cholesterol: 240 mg/dL (High)",
      "severity": "high" | "medium" | "normal",
      "explanation": "one sentence explanation"
    }
  ],
  "keyTakeaways": [
    "specific takeaway with actual numbers where possible"
  ],
  "actionPlan": [
    "specific actionable step"
  ],
  "keyIssues": [
    {
      "issue": "specific issue description",
      "severity": "critical" | "moderate" | "minor"
    }
  ],
  "recommendations": [
    "specific recommendation"
  ],
  "finalSummary": "2-3 sentence conclusion with specific values and clear next steps"
}

Rules:
- Always include actual lab values with units (mg/dL, g/dL, etc.) when found
- Never say values were not listed — extract them from the document
- If a value is truly missing say "Not reported in document"
- Risk level must be based on actual findings not assumptions
- Keep language clear for non-medical users
`;

    if (geminiApiKey) {
      const base64PdfData = buffer.toString('base64');
      for (const modelName of geminiModelCandidates) {
        try {
          let parsed: unknown;
          try {
            parsed = await generateGeminiJson({
              modelName,
              prompt: analysisPrompt,
              base64PdfData,
              extractedText: extracted,
              useSchema: true,
            });
          } catch (inner: unknown) {
            const err = inner as { status?: number };
            if (err?.status === 400) {
              parsed = await generateGeminiJson({
                modelName,
                prompt: analysisPrompt,
                base64PdfData,
                extractedText: extracted,
                useSchema: false,
              });
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
          aiReason = getGeminiFailureReason(aiError, modelName);
          if (aiReason.startsWith('gemini_model_not_found:')) {
            continue;
          }
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
    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || '';
    const publicUrl = patient.publicToken ? `${appBaseUrl}/report/${patient.publicToken}` : null;
    const dashboardReportUrl = `${appBaseUrl}/patient/${patient._id}`;

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
        const emailHtml = generateReportEmailTemplate({
          patientName: patient.name,
          riskLevel: patient.riskLevel,
          reportUrl: publicUrl || dashboardReportUrl,
          aiOverview: extractTopText(aiResponse.overview),
          topFindings: aiResponse.resultsNeedingAttention.slice(0, 2),
          topActionPlan: aiResponse.actionPlan.slice(0, 2),
          hospitalName: uploader?.hospitalName || uploader?.name || 'HealthAI Partner',
        });

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
