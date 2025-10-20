import { motion } from "framer-motion"
import { MessageSquare, Calendar, TrendingUp, Clock } from "lucide-react"

interface StatsCardsProps {
  dailyCount: number
  monthlyCount: number
  totalQueries?: number
}

export function StatsCards({ dailyCount, monthlyCount, totalQueries = 0 }: StatsCardsProps) {
  const stats = [
    {
      title: "Consultas Hoy",
      value: dailyCount.toString(),
      icon: MessageSquare,
      color: "#57F790",
      subtitle: "consultas realizadas",
    },
    {
      title: "Este Mes",
      value: monthlyCount.toString(),
      icon: Calendar,
      color: "#00FF40",
      subtitle: "consultas totales",
    },
    {
      title: "Uso Diario",
      value: `${Math.round((dailyCount / 10) * 100)}%`,
      icon: TrendingUp,
      color: "#57F790",
      subtitle: "de 10 consultas",
    },
    {
      title: "Uso Mensual",
      value: `${Math.round((monthlyCount / 100) * 100)}%`,
      icon: Clock,
      color: "#00FF40",
      subtitle: "de 100 consultas",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => {
        const Icon = stat.icon
        return (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className="rounded-2xl p-6 border"
            style={{
              backgroundColor: '#2a2a2a',
              borderColor: '#3a3a3a'
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm mb-1" style={{ color: '#C8C8C8' }}>{stat.title}</p>
                <h3 className="text-3xl font-bold" style={{ color: '#EDEDED' }}>{stat.value}</h3>
              </div>
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: stat.color + '20' }}
              >
                <Icon className="w-6 h-6" style={{ color: stat.color }} />
              </div>
            </div>
            <p className="text-xs" style={{ color: '#C8C8C8' }}>{stat.subtitle}</p>
          </motion.div>
        )
      })}
    </div>
  )
}
