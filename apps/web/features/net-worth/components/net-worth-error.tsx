import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface NetWorthErrorProps {
  message: string;
}

export function NetWorthError({ message }: NetWorthErrorProps) {
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold">Net Worth</h1>
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-sm text-destructive mb-2">Failed to load net worth data</p>
          <p className="text-xs text-muted-foreground">{message || "Something went wrong"}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
