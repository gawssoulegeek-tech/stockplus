import { Card, CardContent } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: {
    value: number
    label: string
    isPositive: boolean
  }
  className?: string
}

export function StatsCard({ title, value, icon: Icon, trend, className }: StatsCardProps) {
  return (
    <Card className={cn("premium-card", className)}>
      <CardContent className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="h-12 w-12 rounded-2xl bg-gray-50 flex items-center justify-center">
            <Icon className="h-6 w-6 text-gray-400" />
          </div>
          {trend && (
            <div className={cn(
              "text-xs font-bold px-3 py-1 rounded-full",
              trend.isPositive ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
            )}>
              {trend.isPositive ? "+" : "-"}{trend.value}%
            </div>
          )}
        </div>
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{title}</p>
          <p className="text-3xl font-headline font-bold text-gray-900">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}
