import { HomeExplorer } from "@/components/home-explorer";
import { getIndex } from "@/lib/data";
import { formatDate } from "@/lib/format";

export const dynamic = "error";

export default function HomePage() {
  const index = getIndex();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          DevOps release tracker
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {index.tools.length} tools tracked · data updated{" "}
          {formatDate(index.generatedAt)}
        </p>
      </div>
      <HomeExplorer tools={index.tools} generatedAt={index.generatedAt} />
    </div>
  );
}
