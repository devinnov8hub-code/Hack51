import { Suspense } from "react";
import RubricEditorClient from "./RubricEditorClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24">
          <div className="loader" />
        </div>
      }
    >
      <RubricEditorClient />
    </Suspense>
  );
}
