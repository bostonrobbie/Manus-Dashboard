import React from "react";

import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { hasError: true, error };
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle className="text-base">Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700">
              <p>We hit an unexpected error rendering the dashboard.</p>
              {this.state.error ? (
                <pre className="overflow-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100">
                  {this.state.error.message}
                </pre>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={this.handleReload}>
                  Reload
                </Button>
                <Button size="sm" variant="outline" onClick={() => this.setState({ hasError: false, error: undefined })}>
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      );
    }

    return this.props.children;
  }
}
