import { summarizeDataConfidence } from "../data-confidence";

describe("summarizeDataConfidence", () => {
  it("does not claim checks passed while findings are loading", () => {
    expect(summarizeDataConfidence([], true).label).toBe("Checking");
  });

  it("exposes a validation-system failure instead of reporting success", () => {
    expect(
      summarizeDataConfidence([], false, "Validation query failed").label
    ).toBe("Checks unavailable");
  });

  it("reports checks passed when no open findings exist", () => {
    const result = summarizeDataConfidence(
      [{
        severity: "critical",
        status: "resolved",
        message: "Resolved finding",
      }],
      false
    );

    expect(result.label).toBe("Checks passed");
    expect(result.openIssueCount).toBe(0);
  });

  it("prioritizes critical findings over warnings", () => {
    const result = summarizeDataConfidence(
      [
        { severity: "warning", status: "open", message: "Warning" },
        { severity: "critical", status: "open", message: "Critical" },
      ],
      false
    );

    expect(result.label).toBe("Low confidence");
    expect(result.criticalCount).toBe(1);
    expect(result.warningCount).toBe(1);
  });

  it("distinguishes informational coverage gaps from invalid data", () => {
    const result = summarizeDataConfidence(
      [{
        severity: "info",
        status: "open",
        message: "Unable to run a check",
      }],
      false
    );

    expect(result.label).toBe("Partially checked");
    expect(result.infoCount).toBe(1);
  });
});
