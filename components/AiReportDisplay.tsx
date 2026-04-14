type AttentionRow = {
  testName: string;
  result: string;
  normalRange: string;
  status: string;
  whyImportant?: string;
};

export type AiReportDisplayProps = {
  patientName: string;
  /** Same content as DB `aiSummary` (AI `overview`); optional if `aiSummary` is set. */
  overview?: string;
  aiSummary?: string;
  riskLevel?: string;
  /** New format: string lines from AI `resultsNeedingAttention`. */
  resultsNeedingAttention?: string[];
  /** Legacy: structured rows from older analyses. */
  resultsThatNeedAttention?: AttentionRow[];
  keyTakeaways?: string[];
  actionPlan?: string[];
  keyIssues?: string[];
  issues?: string[];
  quickRecommendations?: string[];
  recommendations?: string[];
  finalSummary?: string;
  /** Legacy optional fields (still honored when present). */
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

/** Merge optional string arrays (dedupe) so we never drop data when one prop is empty and the other holds the same field under a legacy name. */
function mergeStringLines(...sources: (string[] | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const arr of sources) {
    if (!arr?.length) continue;
    for (const s of arr) {
      const t = String(s).trim();
      if (t && !seen.has(t)) {
        seen.add(t);
        out.push(t);
      }
    }
  }
  return out;
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

  const takeaways =
    keyTakeaways?.filter((s) => String(s).trim()).map((s) => String(s).trim()) ?? [];
  const planTitle =
    actionPlanTitle?.trim() || `Action plan for ${patientName}`;
  const planList = actionPlan?.filter((s) => String(s).trim()).map((s) => String(s).trim()) ?? [];
  const hasRichPlan = Boolean(actionPlanMarkdown?.trim());
  const issuesList = mergeStringLines(keyIssues, issues);
  const recsList = mergeStringLines(quickRecommendations, recommendations);
  const closing =
    finalSummary?.trim() || overviewText || '';

  const showIssuesBlock = issuesList.length > 0;
  const showRecsBlock = recsList.length > 0;

  return (
    <div className="space-y-10">
      {(overviewText || riskLevel) && (
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Overview
            </h2>
            {riskLevel && (
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors duration-200 ${
                  riskLevel === 'Low'
                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                    : riskLevel === 'Medium'
                      ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                      : 'bg-red-100 text-red-800 hover:bg-red-200'
                }`}
              >
                Risk: {riskLevel}
              </span>
            )}
          </div>
          {overviewText ? (
            <p className="mt-3 text-sm leading-relaxed text-gray-800 transition-colors duration-200">{overviewText}</p>
          ) : null}
        </div>
      )}

      <section className="rounded-lg border border-amber-200 bg-amber-50/40 p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
        <h2 className="text-base font-semibold text-gray-900 flex items-center">
          <svg className="w-5 h-5 mr-2 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 2.502-1.667 0-3.004 1.667-3.004 1.667 0v6.668c0 .995.395 1.818 1.097 2.004 1.097 0 2.136-.872 3.004-2.004 3.004z" />
          </svg>
          Results needing attention
        </h2>
        {attentionLines.length > 0 ? (
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-gray-800">
            {attentionLines.map((line, index) => (
              <li key={index}>{line}</li>
            ))}
          </ul>
        ) : resultsThatNeedAttention && resultsThatNeedAttention.length > 0 ? (
          <div className="mt-4 overflow-x-auto rounded-md border border-amber-100 bg-white">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-amber-50/80">
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-700">
                    Test
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-700">
                    Your value
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-700">
                    Normal range
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-700">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {resultsThatNeedAttention.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50/80">
                    <td className="px-3 py-2.5 font-medium text-gray-900">{row.testName}</td>
                    <td className="px-3 py-2.5 text-gray-800">{row.result}</td>
                    <td className="px-3 py-2.5 text-gray-700">{row.normalRange}</td>
                    <td className="px-3 py-2.5 text-gray-900">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
        <h2 className="text-base font-semibold text-gray-900 flex items-center">
          <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7z" />
          </svg>
          Key takeaways
        </h2>
        {keyTakeawaysIntro?.trim() ? (
          <p className="mt-3 text-sm font-medium text-gray-800">{keyTakeawaysIntro.trim()}</p>
        ) : null}
        {takeaways.length > 0 ? (
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-gray-800">
            {takeaways.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        ) : null}
        {keyTakeawaysClosing?.trim() ? (
          <p className="mt-4 border-t border-gray-100 pt-4 text-sm leading-relaxed text-gray-700">
            {keyTakeawaysClosing.trim()}
          </p>
        ) : null}
      </section>

      <section className="rounded-lg border border-indigo-100 bg-indigo-50/30 p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
        <h2 className="text-base font-semibold text-gray-900 flex items-center">
          <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2v2a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2z" />
          </svg>
          {planTitle}
        </h2>
        {hasRichPlan ? (
          <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-800">
            {actionPlanMarkdown}
          </pre>
        ) : planList.length > 0 ? (
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-gray-800">
            {planList.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        ) : null}
      </section>

      {(showIssuesBlock || showRecsBlock) && (
        <section className="grid gap-4 sm:grid-cols-2">
          {showIssuesBlock ? (
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                <svg className="w-4 h-4 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 2.502-2.502V6.838c0-1.54 1.667-2.502 2.502-2.502z" />
                </svg>
                Key issues
              </h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                {issuesList.map((item, index) => (
                  <li key={index} className="hover:text-gray-900 transition-colors duration-200">{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {showRecsBlock ? (
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Quick recommendations
              </h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                {recsList.map((item, index) => (
                  <li key={index} className="hover:text-gray-900 transition-colors duration-200">{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      )}

      {closing ? (
        <section className="rounded-lg border border-gray-200 bg-gray-50/80 p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
          <h2 className="text-base font-semibold text-gray-900 flex items-center">
            <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Final summary
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-800 transition-colors duration-200">{closing}</p>
        </section>
      ) : null}
    </div>
  );
}
