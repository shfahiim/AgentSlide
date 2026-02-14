import { SlideSpec } from "@/lib/types";

export function TitleSlide({ slide }: { slide: SlideSpec }) {
  return (
    <section className="h-full w-full flex flex-col items-center justify-center text-center p-10">
      <h1 className="text-5xl font-bold mb-4">{slide.title}</h1>
      {slide.subtitle ? <p className="text-xl opacity-80">{slide.subtitle}</p> : null}
    </section>
  );
}
