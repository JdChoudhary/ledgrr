import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import ResetPasswordClient from "./reset-password-client";

export default function ResetPasswordPage() {
  return (
    <div className="grain flex min-h-screen items-center justify-center px-6 py-12">
      <Suspense
        fallback={<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
      >
        <ResetPasswordClient />
      </Suspense>
    </div>
  );
}