import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe, Loader2 } from "lucide-react";
import { CURRENCIES } from "@/features/settings/lib/constants";

interface CurrencyCardProps {
  currency: string;
  onCurrencyChange: (currency: string) => void;
  onSave: () => void;
  isSaving: boolean;
}

export function CurrencyCard({
  currency,
  onCurrencyChange,
  onSave,
  isSaving,
}: CurrencyCardProps) {
  const selected = CURRENCIES.find((c) => c.code === currency);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Currency & Region
        </CardTitle>
        <CardDescription>
          Choose your preferred currency for displaying amounts throughout
          the app.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="currency">Default Currency</Label>
          <Select value={currency} onValueChange={(v) => v && onCurrencyChange(v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a currency" />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.symbol} - {c.name} ({c.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Preview:</strong> All amounts will be displayed using{" "}
            {selected?.name} ({selected?.symbol}).
          </p>
        </div>

        <Button onClick={onSave} disabled={isSaving} className="w-full">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Settings"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
