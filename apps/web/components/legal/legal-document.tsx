type Section = {
  heading: string;
  paragraphs: string[];
  items?: string[];
};

type LegalDocumentProps = {
  title: string;
  updated: string;
  intro?: string;
  sections: Section[];
};

export function LegalDocument({
  title,
  updated,
  intro,
  sections,
}: LegalDocumentProps) {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-16 sm:px-8">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Last updated {updated}
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tighter">{title}</h1>
      {intro ? (
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          {intro}
        </p>
      ) : null}

      <div className="mt-10 space-y-10">
        {sections.map((section, i) => (
          <section key={section.heading}>
            <h2 className="text-lg font-semibold tracking-tight">
              {i + 1}. {section.heading}
            </h2>
            <div className="mt-3 space-y-3">
              {section.paragraphs.map((p, j) => (
                <p
                  key={j}
                  className="text-sm leading-relaxed text-muted-foreground"
                >
                  {p}
                </p>
              ))}
              {section.items ? (
                <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
                  {section.items.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-12 text-sm text-muted-foreground">
        Questions about this document? Contact us at{" "}
        <a
          href="mailto:support@ledgr.dev"
          className="font-medium text-foreground underline underline-offset-4 hover:no-underline"
        >
          support@ledgr.dev
        </a>
        .
      </p>
    </div>
  );
}