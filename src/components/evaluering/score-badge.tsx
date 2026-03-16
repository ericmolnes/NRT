import { Badge } from "@/components/ui/badge";

interface ScoreBadgeProps {
  score: number;
}

export function ScoreBadge({ score }: ScoreBadgeProps) {
  if (score >= 8) {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
        {score}/10
      </Badge>
    );
  }

  if (score >= 5) {
    return (
      <Badge className="bg-amber-100 text-amber-700 border-amber-200">
        {score}/10
      </Badge>
    );
  }

  return (
    <Badge className="bg-red-100 text-red-700 border-red-200">
      {score}/10
    </Badge>
  );
}
