import type { SupabaseClient } from "@supabase/supabase-js";
import type { DataQualityFinding } from "./data-quality-validation.ts";

interface DataQualityScope {
  symbol: string;
  provider: string;
  endpoint: string;
}

export async function syncDataQualityFindings(
  supabase: SupabaseClient,
  scope: DataQualityScope,
  findings: DataQualityFinding[]
): Promise<boolean> {
  const serializedFindings = findings.map((finding) => ({
    check_code: finding.checkCode,
    field_name: finding.fieldName ?? null,
    severity: finding.severity,
    message: finding.message,
    evidence: finding.evidence,
    source_date: finding.sourceDate ?? null,
    source_period: finding.sourcePeriod ?? null,
    source_reference: finding.sourceReference ?? null,
  }));

  const { error } = await supabase.rpc("sync_data_quality_issues", {
    p_symbol: scope.symbol,
    p_provider: scope.provider,
    p_endpoint: scope.endpoint,
    p_findings: serializedFindings,
  });

  if (error) {
    console.error(
      `[data-quality] Failed to persist findings for ${scope.symbol}/${scope.endpoint}: ${error.message}`
    );
    return false;
  }

  return true;
}
