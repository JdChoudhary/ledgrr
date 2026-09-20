import { AdminGuard } from "@/components/admin/admin-guard";

// The guard reads the session from the auth server at request time,
// so this segment must not be statically prerendered at build time.
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <AdminGuard>
      <div className="flex min-h-screen flex-col bg-muted/30">
        <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-8 sm:px-8">
          {children}
        </main>
      </div>
    </AdminGuard>
  );
}
