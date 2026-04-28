import { SlideSpec } from "../types";

function hasVisual<T extends SlideSpec["visuals"][number]["type"]>(
  slide: SlideSpec,
  type: T,
): slide is SlideSpec & {
  visuals: Array<Extract<SlideSpec["visuals"][number], { type: T }>>;
} {
  return slide.visuals.some((visual) => visual.type === type);
}

function normalizeSources(slide: SlideSpec): SlideSpec {
  if (slide.bullets.length > 0 || !slide.citations?.length) return slide;
  return {
    ...slide,
    bullets: slide.citations.slice(0, 6).map((citation) => citation.text.trim()).filter(Boolean),
  };
}

export function normalizeSlideForRender(slide: SlideSpec): SlideSpec {
  let next: SlideSpec = normalizeSources({
    ...slide,
    bullets: [...slide.bullets],
    visuals: [...slide.visuals],
  });

  switch (next.layout) {
    case "full_visual":
      if (!hasVisual(next, "image") && !hasVisual(next, "chart")) {
        next = { ...next, layout: "bullets" };
      }
      break;
    case "image_with_caption":
      if (!hasVisual(next, "image")) {
        next = { ...next, layout: "bullets" };
      } else {
        next = { ...next, bullets: next.bullets.slice(0, 3) };
      }
      break;
    case "big_number":
      if (!hasVisual(next, "big_number")) {
        next = { ...next, layout: "bullets" };
      } else {
        next = { ...next, bullets: next.bullets.slice(0, 4) };
      }
      break;
    case "quote":
      if (next.bullets.length === 0) {
        next = { ...next, layout: "bullets" };
      } else {
        next = { ...next, bullets: next.bullets.slice(0, 1) };
      }
      break;
    case "section_divider":
      next = { ...next, bullets: next.bullets.slice(0, 3) };
      break;
    case "agenda":
    case "faq":
    case "sources":
    case "closing_cta":
      next = { ...next, bullets: next.bullets.slice(0, 6) };
      break;
    case "timeline":
    case "roadmap":
    case "process_flow":
      if (next.bullets.length < 2 && !hasVisual(next, "chart")) {
        next = { ...next, layout: "bullets" };
      } else {
        next = { ...next, bullets: next.bullets.slice(0, 5) };
      }
      break;
    case "comparison":
    case "pros_cons":
    case "before_after":
    case "case_study":
      if (next.bullets.length < 2 && !hasVisual(next, "table")) {
        next = { ...next, layout: "bullets" };
      } else {
        next = { ...next, bullets: next.bullets.slice(0, 4) };
      }
      break;
    case "risk_register":
      if (!hasVisual(next, "table") && next.bullets.length < 2) {
        next = { ...next, layout: "bullets" };
      } else {
        next = { ...next, bullets: next.bullets.slice(0, 5) };
      }
      break;
    case "stat_grid":
    case "team_profiles":
    case "swot_matrix":
      if (next.bullets.length === 0 && !hasVisual(next, "big_number")) {
        next = { ...next, layout: "bullets" };
      } else {
        next = { ...next, bullets: next.bullets.slice(0, 4) };
      }
      break;
    default:
      break;
  }

  return next;
}
