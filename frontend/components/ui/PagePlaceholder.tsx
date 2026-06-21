/** Page header + "coming in Step N" note, used for screens not yet built out. */
export function PagePlaceholder({
  title,
  subtitle,
  step,
}: {
  title: string;
  subtitle: string;
  step: string;
}) {
  return (
    <>
      <div className="mb-4">
        <h1 className="text-[28px] font-semibold tracking-[-0.01em] text-ink">{title}</h1>
        <p className="mt-0.5 text-[13px] text-ink-secondary">{subtitle}</p>
      </div>
      <div className="rounded-card border border-black/[0.06] bg-card p-6 shadow-card">
        <p className="text-[13px] text-ink-secondary">
          This screen is built in <span className="font-semibold text-ink">{step}</span>.
          The app shell, navigation and design system are in place.
        </p>
      </div>
    </>
  );
}
