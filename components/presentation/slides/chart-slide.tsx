import { SlideSpec } from "@/lib/types";
import { VegaChart } from "../charts/vega-chart";

export function ChartSlide({ slide }: { slide: SlideSpec }) {
  const chart = slide.visuals.find((asset) => asset.type === "chart");
  return (
    <section className="h-full w-full p-8 grid grid-cols-2 gap-6">
      <div>
        <h2 className="text-3xl font-semibold mb-4">{slide.title}</h2>
        <ul className="list-disc pl-5 space-y-3">
          {slide.bullets.map((bullet, idx) => (
            <li key={`${slide.slideNumber}-${idx}`}>{bullet}</li>
          ))}
        </ul>
      </div>
      <div className="h-[420px] bg-white/5 rounded-xl p-4">
        {chart?.vegaLiteSpec ? <VegaChart spec={chart.vegaLiteSpec} /> : <p>No chart data</p>}
      </div>
    </section>
  );
}
