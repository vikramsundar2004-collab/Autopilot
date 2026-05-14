import type { ReactElement } from "react";

import type { SlideArtifactSlide } from "../../shared/artifacts";

export type SlideLayout = "cover" | "bullets" | "two_column" | "quote" | "closing";

export function pickSlideLayout(slide: SlideArtifactSlide, index: number, total: number): SlideLayout {
  const text = `${slide.title} ${slide.bullets.join(" ")} ${slide.speakerNotes ?? ""}`;
  if (index === 0) {
    return "cover";
  }
  if (index === total - 1) {
    return "closing";
  }
  if (/"[^"]{12,}"/u.test(text) || /\baccording to\b/iu.test(text)) {
    return "quote";
  }
  if (slide.bullets.length >= 6 || /\b(vs\.?|versus|compared to|before\b.*\bafter|current\b.*\bproposed)\b/iu.test(text)) {
    return "two_column";
  }
  return "bullets";
}

export function SlideTemplate({ slide, index, total }: { slide: SlideArtifactSlide; index: number; total: number }): ReactElement {
  const layout = pickSlideLayout(slide, index, total);
  const firstBlock = slide.bullets.slice(0, 3);
  const secondBlock = slide.bullets.slice(3, 6);
  return (
    <article className={`slide-preview-card ${layout === "two_column" ? "two-column" : layout}`}>
      <span>{String(index + 1).padStart(2, "0")}</span>
      <h3>{slide.title}</h3>
      {layout === "cover" && <p>{slide.bullets[0] ?? slide.speakerNotes ?? "A focused opening slide."}</p>}
      {layout === "quote" && <blockquote>{slide.bullets[0] ?? slide.speakerNotes ?? "A focused quote or proof point."}</blockquote>}
      {layout === "two_column" && (
        <div className="slide-content-blocks">
          <section>
            <strong>Main points</strong>
            {firstBlock.map((bullet) => (
              <small key={bullet}>{bullet}</small>
            ))}
          </section>
          <section>
            <strong>Details</strong>
            {(secondBlock.length > 0 ? secondBlock : [slide.speakerNotes ?? "Use this slide to expand the argument."]).map((bullet) => (
              <small key={bullet}>{bullet}</small>
            ))}
          </section>
        </div>
      )}
      {layout === "closing" && (
        <div className="slide-closing-callout">
          {(slide.bullets.length > 0 ? slide.bullets : ["Confirm the next step and approval owner."]).slice(0, 3).map((bullet) => (
            <strong key={bullet}>{bullet}</strong>
          ))}
        </div>
      )}
      {layout === "bullets" && (
        <ul>
          {slide.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      )}
    </article>
  );
}
