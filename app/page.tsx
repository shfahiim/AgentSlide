import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen p-10 max-w-3xl mx-auto">
      <h1 className="text-4xl font-bold mb-4">SlideMaker</h1>
      <p className="mb-8">Generate PPTX and web slides from a prompt.</p>
      <Link className="underline" href="/create">Start creating</Link>
    </main>
  );
}
