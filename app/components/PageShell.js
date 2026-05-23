/* Editorial page shell — used by every subpage to get consistent
   eyebrow + display heading + lede styling. Keeps subpages coherent
   with the home page's voice without duplicating wrapper markup. */
export default function PageShell({ eyebrow, title, lede, children }) {
  return (
    <main className="relative min-h-screen z-10">
      <article className="max-w-[820px] mx-auto px-6 lg:px-10 pt-16 lg:pt-24 pb-12">
        <header className="mb-12 lg:mb-16">
          {eyebrow && (
            <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--gold)] mb-6 rise" style={{ animationDelay: '0ms' }}>
              <span className="inline-block w-6 h-px bg-[var(--gold)] align-middle mr-3 -translate-y-[2px]" />
              {eyebrow}
            </p>
          )}
          <h1 className="font-display text-5xl lg:text-6xl leading-[1.05] tracking-tight text-balance rise" style={{ animationDelay: '80ms' }}>
            {title}
          </h1>
          {lede && (
            <p className="mt-6 text-lg text-[var(--ink-200)] leading-relaxed max-w-[60ch] text-pretty rise" style={{ animationDelay: '160ms' }}>
              {lede}
            </p>
          )}
        </header>
        <div className="rise" style={{ animationDelay: '240ms' }}>
          {children}
        </div>
      </article>
    </main>
  );
}

/* Section heading inside an article — smaller display serif with
   numbered eyebrow, matching the Filters section style. */
export function SectionHeading({ number, label, children }) {
  return (
    <div className="mb-6 mt-16 first:mt-0">
      <div className="flex items-baseline gap-3 mb-3">
        {number && (
          <span className="font-mono text-[10px] text-[var(--ink-600)] tracking-wider">
            {number}
          </span>
        )}
        {label && (
          <span className="text-[10px] uppercase tracking-[0.28em] text-[var(--ink-400)]">
            {label}
          </span>
        )}
      </div>
      <h2 className="font-display text-3xl lg:text-4xl leading-tight tracking-tight text-balance">
        {children}
      </h2>
    </div>
  );
}

/* Prose block — applies editorial typography to a chunk of children.
   Use for paragraphs, lists, etc. inside a page. */
export function Prose({ children, className = '' }) {
  return (
    <div className={`prose-editorial space-y-5 text-[var(--ink-200)] leading-relaxed text-pretty ${className}`}>
      {children}
    </div>
  );
}
