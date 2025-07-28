import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="container mx-auto py-12 px-4 max-w-2xl text-center">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Post Not Found
        </h1>
        <p className="text-muted-foreground text-lg">
          The post you&apos;re looking for doesn&apos;t exist or has been
          removed.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          <ArrowLeft size={16} />
          Go Home
        </Link>
        <Link
          href="/free-board"
          className="inline-flex items-center gap-2 px-6 py-3 border border-border rounded-md hover:bg-muted transition-colors"
        >
          Browse Posts
        </Link>
      </div>
    </div>
  );
}
