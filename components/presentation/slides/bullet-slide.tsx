import { SlideSpec } from "@/lib/types";

export function BulletSlide({ slide }: { slide: SlideSpec }) {
  return (
    <section className="h-full w-full p-10">
      <h2 className="text-4xl font-semibold mb-8">{slide.title}</h2>
      <ul className="list-disc pl-6 space-y-4 text-xl">
        {slide.bullets.map((bullet, index) => (
          <li key={`${slide.slideNumber}-${index}`}>{bullet}</li>
        ))}
      </ul>
    </section>
  );
}
