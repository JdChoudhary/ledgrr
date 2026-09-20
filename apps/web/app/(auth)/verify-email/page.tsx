import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import VerifyEmailClient from "./verify-email-client";

export default function VerifyEmailPage() {
  return (
    <div className="grain flex min-h-screen items-center justify-center px-6 py-12">
      <Suspense fallback={<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}>
        <VerifyEmailClient />
      </Suspense>
    </div>
  );
}