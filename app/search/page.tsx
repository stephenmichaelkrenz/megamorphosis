import { Suspense } from "react";
import SearchClient from "./SearchClient";

export default function SearchPage() {
  return (
    <main className="wide-shell">
      <Suspense fallback={<p className="muted panel">Loading search...</p>}>
        <SearchClient />
      </Suspense>
    </main>
  );
}
