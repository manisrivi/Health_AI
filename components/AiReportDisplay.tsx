import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type AttentionRow = {
  testName: string;
  result: string;
  normalRange: string;
  status: string;
  whyImportant?: string;
};

export type AiReportDisplayProps = {
  patientName: string;
  overview?: string;
  aiSummary?: string;
  riskLevel?: string;
  resultsNeedingAttention?: string[];
  resultsThatNeedAttention?: AttentionRow[];
  keyTakeaways?: string[];
  actionPlan?: string[];
  keyIssues?: string[];
  issues?: string[];
  quickRecommendations?: string[];
  recommendations?: string[];
  finalSummary?: string;
  keyTakeawaysIntro?: string;
  keyTakeawaysClosing?: string;
  actionPlanTitle?: string;
  actionPlanMarkdown?: string;
};

function rowsToAttentionLines(rows: AttentionRow[]): string[] {
  return rows.map((row) => {
    const parts = [
      row.testName && `${row.testName}:`,
      row.result,
      row.normalRange && `ref ${row.normalRange}`,
      row.status && `(${row.status})`,
    ].filter(Boolean);
    return parts.join(' ').trim() || `${row.testName}: see report`;
  });
}

function mergeStringLines(...sources: (string[] | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const arr of sources) {
    if (!arr?.length) continue;
    for (const item of arr) {
      const trimmed = String(item).trim();
      if (trimmed && !seen.has(trimmed)) {
        seen.add(trimmed);
        out.push(trimmed);
      }
    }
  }
  return out;
}

function getRiskVariant(riskLevel?: string) {
  switch (riskLevel) {
    case 'High':
      return 'destructive' as const;
    case 'Medium':
      return 'warning' as const;
    case 'Low':
      return 'success' as const;
    default:
      return 'secondary' as const;
  }
}

function getAttentionTone(line: string) {
  const normalized = line.toLowerCase();
  if (/(high|elevated|abnormal|critical|urgent)/.test(normalized)) {
    return 'bg-rose-50 text-rose-900';
  }
  if (/(normal|within range|healthy|stable)/.test(normalized)) {
    return 'bg-emerald-50 text-emerald-900';
  }
  return 'bg-amber-50 text-amber-900';
}

function getIssueTone(line: string) {
  const normalized = line.toLowerCase();
  if (/(critical|severe|urgent|danger)/.test(normalized)) {
    return 'bg-rose-50 text-rose-900';
  }
  if (/(moderate|monitor|watch|elevated)/.test(normalized)) {
    return 'bg-amber-50 text-amber-900';
  }
  return 'bg-yellow-50 text-yellow-900';
}

export default function AiReportDisplay({
  patientName,
  overview,
  aiSummary,
  riskLevel,
  resultsNeedingAttention,
  resultsThatNeedAttention,
  keyTakeaways,
  actionPlan,
  keyIssues,
  issues,
  quickRecommendations,
  recommendations,
  finalSummary,
  keyTakeawaysIntro,
  keyTakeawaysClosing,
  actionPlanTitle,
  actionPlanMarkdown,
}: AiReportDisplayProps) {
  const overviewText = (overview ?? aiSummary)?.trim() ?? '';
  const attentionFromStrings = mergeStringLines(resultsNeedingAttention);
  const attentionLines =
    attentionFromStrings.length > 0
      ? attentionFromStrings
      : resultsThatNeedAttention?.length
        ? rowsToAttentionLines(resultsThatNeedAttention)
        : [];

  const takeaways = keyTakeaways?.filter(Boolean).map((item) => String(item).trim()) ?? [];
  const planTitle = actionPlanTitle?.trim() || `Action plan for ${patientName}`;
  const planList = actionPlan?.filter(Boolean).map((item) => String(item).trim()) ?? [];
  const issuesList = mergeStringLines(keyIssues, issues);
  const recommendationsList = mergeStringLines(quickRecommendations, recommendations);
  const closing = finalSummary?.trim() || overviewText || '';

  return (
    <div className="space-y-6">
      <Card className="border-sky-100 bg-[linear-gradient(135deg,rgba(248,250,252,1),rgba(240,249,255,0.9))]">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle>Overview</CardTitle>
            {riskLevel ? <Badge variant={getRiskVariant(riskLevel)}>{riskLevel} risk</Badge> : null}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-7 text-slate-700">
            {overviewText || 'AI summary is not available yet.'}
          </p>
        </CardContent>
      </Card>

      <Card className="border-amber-100">
        <CardHeader>
          <CardTitle>Results needing attention</CardTitle>
        </CardHeader>
        <CardContent>
          {attentionLines.length > 0 ? (
            <ul className="space-y-3">
              {attentionLines.map((line, index) => (
                <li key={index} className={`rounded-2xl px-4 py-3 text-sm ${getAttentionTone(line)}`}>
                  {line}
                </li>
              ))}
            </ul>
          ) : resultsThatNeedAttention?.length ? (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Test</TableHead>
                    <TableHead>Your value</TableHead>
                    <TableHead>Normal range</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resultsThatNeedAttention.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium text-slate-900">{row.testName}</TableCell>
                      <TableCell>{row.result}</TableCell>
                      <TableCell>{row.normalRange}</TableCell>
                      <TableCell>{row.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No flagged results were included in this report.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Key takeaways</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {keyTakeawaysIntro?.trim() ? (
              <p className="text-sm font-medium text-slate-700">{keyTakeawaysIntro.trim()}</p>
            ) : null}
            {takeaways.length > 0 ? (
              <ul className="space-y-3">
                {takeaways.map((item, index) => (
                  <li key={index} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No takeaways were generated for this report.</p>
            )}
            {keyTakeawaysClosing?.trim() ? (
              <p className="text-sm leading-7 text-slate-600">{keyTakeawaysClosing.trim()}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-indigo-100 bg-indigo-50/30">
          <CardHeader>
            <CardTitle>{planTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            {actionPlanMarkdown?.trim() ? (
              <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-slate-700">
                {actionPlanMarkdown}
              </pre>
            ) : planList.length > 0 ? (
              <ul className="space-y-3">
                {planList.map((item, index) => (
                  <li key={index} className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-slate-700">
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No action plan is available yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Key issues</CardTitle>
          </CardHeader>
          <CardContent>
            {issuesList.length > 0 ? (
              <ul className="space-y-3">
                {issuesList.map((item, index) => (
                  <li key={index} className={`rounded-2xl px-4 py-3 text-sm ${getIssueTone(item)}`}>
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No issues were highlighted in this report.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            {recommendationsList.length > 0 ? (
              <ul className="space-y-3">
                {recommendationsList.map((item, index) => (
                  <li key={index} className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No recommendations were provided.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {closing ? (
        <Card>
          <CardHeader>
            <CardTitle>Final summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-7 text-slate-700">{closing}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
