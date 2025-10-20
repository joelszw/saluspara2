import { MessageSquare, BarChart3, History, Settings, User } from "lucide-react"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

interface SidebarProps {
  activeSection?: string
}

export function Sidebar({ activeSection = "chat" }: SidebarProps) {
  const { t } = useTranslation()

  const menuItems = [
    { id: "chat", icon: MessageSquare, label: "Chat Médico" },
    { id: "history", icon: History, label: "Historial" },
    { id: "stats", icon: BarChart3, label: "Estadísticas" },
    { id: "profile", icon: User, label: "Perfil" },
    { id: "settings", icon: Settings, label: "Configuración" },
  ]

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r" style={{ 
      backgroundColor: '#282828',
      borderColor: '#3a3a3a'
    }}>
      {/* Logo/Brand */}
      <div className="p-6 border-b" style={{ borderColor: '#3a3a3a' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#57F790' }}>
            <MessageSquare className="w-6 h-6" style={{ color: '#282828' }} />
          </div>
          <div>
            <h2 className="font-bold text-lg" style={{ color: '#EDEDED' }}>Salustia</h2>
            <p className="text-xs" style={{ color: '#C8C8C8' }}>Chat Médico</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = activeSection === item.id
          
          return (
            <button
              key={item.id}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                isActive && "shadow-lg"
              )}
              style={{
                backgroundColor: isActive ? '#57F790' : 'transparent',
                color: isActive ? '#282828' : '#C8C8C8'
              }}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
