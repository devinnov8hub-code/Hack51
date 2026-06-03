import { Suspense } from "react";
import VerificationForm from "@/app/components/forms/VerificationForm";

export default function Verification() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24">
          <div className="loader" />
        </div>
      }
    >
      <VerificationForm />
    </Suspense>
  );
}
