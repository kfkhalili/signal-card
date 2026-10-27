import DemoCardsGrid from "@/components/landing/DemoCardsGrid";

const workflowSteps = [
  {
    number: "1",
    title: "Personalize Compass",
    description:
      "Choose the characteristics you care about. Your preferences change the order of research leads, not the underlying company facts.",
    preview: (
      <div
        aria-label="Illustrative Compass preferences"
        className="flex flex-wrap gap-2"
      >
        {["Financial quality", "Valuation", "Resilience"].map((preference) => (
          <span
            key={preference}
            className="rounded-full border bg-background px-3 py-1 text-xs font-medium"
          >
            {preference}
          </span>
        ))}
      </div>
    ),
  },
  {
    number: "2",
    title: "Inspect a candidate",
    description:
      "See why a company surfaced, then review its financial cards and risk flags before drawing your own conclusion.",
    preview: (
      <div className="rounded-md border bg-background p-3 text-left text-xs">
        <p className="font-semibold">Why this synthetic candidate appears</p>
        <p className="mt-1 text-muted-foreground">
          Durable cash generation and reasonable valuation match the selected
          focus. The result is a research lead, not a recommendation.
        </p>
      </div>
    ),
  },
  {
    number: "3",
    title: "Save to Workspace",
    description:
      "Keep the relevant company cards together so you can return to the evidence as your research continues.",
    preview: (
      <div className="flex items-center justify-between gap-3 rounded-md border bg-background p-3 text-left">
        <div>
          <p className="text-sm font-semibold">Northstar Components</p>
          <p className="text-xs text-muted-foreground">4 research cards saved</p>
        </div>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
          Workspace
        </span>
      </div>
    ),
  },
] as const;

export default function SyntheticWorkflow() {
  return (
    <div className="space-y-6">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Synthetic walkthrough — fictional company and illustrative values
      </p>

      <ol
        aria-label="Three-step research workflow"
        className="grid gap-4 text-left md:grid-cols-3"
      >
        {workflowSteps.map((step) => (
          <li
            key={step.number}
            className="flex min-w-0 flex-col rounded-lg border bg-card p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
              >
                {step.number}
              </span>
              <h3 className="text-lg font-semibold">{step.title}</h3>
            </div>
            <p className="mb-4 mt-3 text-sm text-foreground/80">
              {step.description}
            </p>
            <div className="mt-auto">{step.preview}</div>
          </li>
        ))}
      </ol>

      <div
        aria-label="Interactive synthetic evidence preview"
        className="rounded-xl border bg-card p-3 shadow-sm sm:p-4"
      >
        <div className="mb-4 text-left">
          <p className="text-sm font-semibold">Inspect the evidence</p>
          <p className="text-xs text-muted-foreground">
            This is the real card interface populated only with the fictional
            Northstar Components fixture.
          </p>
        </div>
        <DemoCardsGrid />
      </div>
    </div>
  );
}
