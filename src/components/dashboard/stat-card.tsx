import { Card, CardContent } from "@/components/ui/card";

type StatCardProps = {
  label: string;
  value: string | number;
  hint: string;
};

export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="relative">
        <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-tea-100 blur-2xl" />
        <p className="text-sm text-stone-500">{label}</p>
        <p className="mt-4 text-3xl font-semibold text-stone-900">{value}</p>
        <p className="mt-2 text-sm text-stone-500">{hint}</p>
      </CardContent>
    </Card>
  );
}

