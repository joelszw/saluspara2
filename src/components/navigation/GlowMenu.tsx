import React, { useState } from "react"
import { motion } from "framer-motion"
import { Home, Bell, Settings, User } from "lucide-react"
import { cn } from "@/lib/utils"

interface MenuItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const menuItems: MenuItem[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "profile", label: "Profile", icon: User },
]

export function GlowMenu() {
  const [activeItem, setActiveItem] = useState("home")

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative"
      >
        {/* Glow background */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 blur-xl rounded-full" />
        
        {/* Menu container */}
        <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-full px-4 py-3 shadow-2xl">
          <div className="flex items-center gap-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = activeItem === item.id
              
              return (
                <motion.button
                  key={item.id}
                  onClick={() => setActiveItem(item.id)}
                  className={cn(
                    "relative px-5 py-2.5 rounded-full transition-all duration-300",
                    "hover:scale-105 active:scale-95",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                    isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {/* Active background with glow */}
                  {isActive && (
                    <>
                      <motion.div
                        layoutId="activeBackground"
                        className="absolute inset-0 bg-primary rounded-full"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                      <motion.div
                        layoutId="activeGlow"
                        className="absolute inset-0 bg-primary blur-lg rounded-full opacity-50"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    </>
                  )}
                  
                  {/* Icon and label */}
                  <span className="relative flex items-center gap-2 font-medium">
                    <Icon className="w-4 h-4" />
                    {isActive && (
                      <motion.span
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: "auto", opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </span>
                </motion.button>
              )
            })}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
