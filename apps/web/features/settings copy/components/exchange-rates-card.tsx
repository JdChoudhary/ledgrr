"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { ArrowRightLeft, RefreshCw, Loader2, Plus } from "lucide-react";
import { CURRENCIES } from "@/features/settings/lib/constants";
import type { CurrencySettings, ExchangeRate } from "@/features/settings/lib/types";

interface ExchangeRatesCardProps {
  settings: CurrencySettings | null;
}

export function ExchangeRatesCard({ settings }: ExchangeRatesCardProps) {
  const queryClient = useQueryClient();
  const [newFrom, setNewFrom] = useState("");
  const [newTo, setNewTo] = useState("");
  const [newRate, setNewRate] = useState("");

  const { data: rates = [], isLoading } = useQuery<ExchangeRate[]>({
    queryKey: ["exchange-rates"],
    queryFn: () => api.get("/api/exchange-rates"),
  });

  const addMutation = useMutation({
    mutationFn: (data: { baseCurrency: string; targetCurrency: string; rate: string }) =>
      api.post("/api/exchange-rates", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exchange-rates"] });
      setNewFrom("");
      setNewTo("");
      setNewRate("");
      toast.success("Exchange rate added");
    },
    onError: () => toast.error("Failed to add exchange rate"),
  });

  const handleAdd = () => {
    if (!newFrom || !newTo || !newRate) return;
    if (newFrom === newTo) {
      toast.error("Currencies must be different");
      return;
    }
    addMutation.mutate({
      baseCurrency: newFrom,
      targetCurrency: newTo,
      rate: newRate,
    });
  };

  const userCurrency = settings?.currency || "USD";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5" />
          Exchange Rates
        </CardTitle>
        <CardDescription>
          Manage exchange rates for multi-currency transactions. Your base
          currency is {userCurrency}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading rates...
          </div>
        ) : rates.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No exchange rates configured. Add rates below to enable multi-currency
            support.
          </p>
        ) : (
          <div className="space-y-1">
            {rates.slice(0, 10).map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between text-sm py-1.5 px-2 rounded-lg bg-muted/30"
              >
                <span className="font-medium">
                  {r.baseCurrency} → {r.targetCurrency}
                </span>
                <span className="font-mono text-muted-foreground">
                  {parseFloat(r.rate).toFixed(4)}
                </span>
              </div>
            ))}
            {rates.length > 10 && (
              <p className="text-xs text-muted-foreground">
                +{rates.length - 10} more rates
              </p>
            )}
          </div>
        )}

        <div className="border-t pt-4 space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Add Exchange Rate
          </p>
          <div className="grid grid-cols-3 gap-2">
            <Select value={newFrom} onValueChange={(v) => v && setNewFrom(v)}>
              <SelectTrigger>
                <SelectValue placeholder="From" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={newTo} onValueChange={(v) => v && setNewTo(v)}>
              <SelectTrigger>
                <SelectValue placeholder="To" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="number"
              placeholder="Rate"
              value={newRate}
              onChange={(e) => setNewRate(e.target.value)}
              step="0.0001"
              min="0"
            />
          </div>
          <Button
            onClick={handleAdd}
            disabled={!newFrom || !newTo || !newRate || addMutation.isPending}
            size="sm"
            className="w-full"
          >
            {addMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Add Rate
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
