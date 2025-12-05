import { Card, CardContent } from '@/components/ui/card';
import { Info } from 'lucide-react';

interface PortfolioSummaryProps {
  summary: string;
}

export function PortfolioSummary({ summary }: PortfolioSummaryProps) {
  return (
    <Card className="bg-muted/30">
      <CardContent className="pt-6">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed text-foreground">
            {summary}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
