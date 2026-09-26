"use client";

import * as React from "react";

type ChartErrorBoundaryProps = {
  children: React.ReactNode;
  fallback: React.ReactNode;
};

type ChartErrorBoundaryState = { hasError: boolean };

/**
 * Keeps a single chart from taking down the page: if the chart throws while
 * rendering, we swap in the caller's empty-state fallback.
 */
export class ChartErrorBoundary extends React.Component<
  ChartErrorBoundaryProps,
  ChartErrorBoundaryState
> {
  state: ChartErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ChartErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[chart] render failed:", error);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
