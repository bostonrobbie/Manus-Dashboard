import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface ChartSkeletonProps {
  title: string;
  children?: ReactNode;
}

function ChartSkeleton({ title, children }: ChartSkeletonProps) {
  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-sm">{title}</CardTitle>
        <span className="text-xs font-medium text-slate-500">Live</span>
      </CardHeader>
      <CardContent>
        <div className="min-h-[200px] text-sm text-slate-600">
          {children ?? <div className="h-[180px] rounded-lg bg-slate-100" />}
        </div>
      </CardContent>
    </Card>
  );
}

export default ChartSkeleton;
