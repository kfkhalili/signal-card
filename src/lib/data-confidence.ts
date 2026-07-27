export interface DataQualityIssueSummaryInput {
  severity: string;
  status: string;
  message: string;
}

export interface DataConfidenceSummary {
  label:
    | "Checking"
    | "Checks unavailable"
    | "Checks passed"
    | "Partially checked"
    | "Review"
    | "Low confidence";
  openIssueCount: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  description: string;
  className: string;
}

export function summarizeDataConfidence(
  issues: DataQualityIssueSummaryInput[],
  isLoading: boolean,
  error: string | null = null
): DataConfidenceSummary {
  if (isLoading) {
    return {
      label: "Checking",
      openIssueCount: 0,
      criticalCount: 0,
      warningCount: 0,
      infoCount: 0,
      description: "Deterministic provider-data checks are still loading.",
      className: "border-muted-foreground/30 text-muted-foreground",
    };
  }

  if (error) {
    return {
      label: "Checks unavailable",
      openIssueCount: 0,
      criticalCount: 0,
      warningCount: 0,
      infoCount: 0,
      description: error,
      className: "border-muted-foreground/30 text-muted-foreground",
    };
  }

  const openIssues = issues.filter((issue) => issue.status === "open");
  const criticalCount = openIssues.filter(
    (issue) => issue.severity === "critical"
  ).length;
  const warningCount = openIssues.filter(
    (issue) => issue.severity === "warning"
  ).length;
  const infoCount = openIssues.filter(
    (issue) => issue.severity === "info"
  ).length;
  const issueMessages = openIssues
    .slice(0, 3)
    .map((issue) => issue.message)
    .join(" ");

  if (criticalCount > 0) {
    return {
      label: "Low confidence",
      openIssueCount: openIssues.length,
      criticalCount,
      warningCount,
      infoCount,
      description: issueMessages,
      className: "border-red-300 bg-red-500/10 text-red-700",
    };
  }

  if (warningCount > 0) {
    return {
      label: "Review",
      openIssueCount: openIssues.length,
      criticalCount,
      warningCount,
      infoCount,
      description: issueMessages,
      className: "border-amber-300 bg-amber-500/10 text-amber-700",
    };
  }

  if (infoCount > 0) {
    return {
      label: "Partially checked",
      openIssueCount: openIssues.length,
      criticalCount,
      warningCount,
      infoCount,
      description: issueMessages,
      className: "border-blue-300 bg-blue-500/10 text-blue-700",
    };
  }

  return {
    label: "Checks passed",
    openIssueCount: 0,
    criticalCount: 0,
    warningCount: 0,
    infoCount: 0,
    description:
      "No open issues were found by the currently enabled deterministic checks.",
    className: "border-green-300 bg-green-500/10 text-green-700",
  };
}
