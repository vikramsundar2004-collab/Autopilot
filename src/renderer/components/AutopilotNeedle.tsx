type AutopilotNeedleProps = {
  className?: string;
  label?: string;
};

export function AutopilotNeedle({ className = "", label }: AutopilotNeedleProps): JSX.Element {
  const ariaProps = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };

  return (
    <svg className={`autopilot-needle ${className}`.trim()} viewBox="0 0 64 96" focusable="false" {...ariaProps}>
      <circle className="needle-disc" cx="32" cy="51" r="31" />
      <path className="needle-wing needle-wing-left" d="M32 6 59 89 32 72 5 89Z" />
      <path className="needle-wing needle-wing-right" d="M32 6 59 89 32 72Z" />
      <path className="needle-core" d="M32 22 45 64 32 56 19 64Z" />
      <path className="needle-ridge" d="M32 6 32 72" />
    </svg>
  );
}
