import { Suspense } from "react";
import ChallengesPageClient from "./ChallengesClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24">
          <div className="loader" />
        </div>
      }
    >
      <ChallengesPageClient />
    </Suspense>
  );
}
