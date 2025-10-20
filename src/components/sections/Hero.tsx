import React from "react"
import { motion } from "framer-motion"
import { useTranslation } from "react-i18next"
import { ConversationalChat } from "@/components/chat/ConversationalChat"

interface HeroProps {
  userId: string | null
  counts: { daily: number; monthly: number }
  onUsageUpdate: () => void
}

export function Hero({ userId, counts, onUsageUpdate }: HeroProps) {
  const { t } = useTranslation()

  return (
    <section className="relative min-h-screen flex items-center justify-center py-24 px-4" style={{ backgroundColor: '#282828' }}>
      <div className="container mx-auto max-w-4xl">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.h1 
            className="text-6xl md:text-7xl lg:text-8xl font-bold mb-8 tracking-tight"
            style={{ color: '#EDEDED' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {t('hero.title')}
          </motion.h1>
          
          <motion.p 
            className="text-xl md:text-2xl max-w-2xl mx-auto mb-20"
            style={{ color: '#C8C8C8' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {t('hero.subtitle')}
          </motion.p>
        </motion.div>
        
        {/* Conversational Chat */}
        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="w-full max-w-3xl">
            <ConversationalChat 
              userId={userId}
              counts={counts}
              onUsageUpdate={onUsageUpdate}
            />
          </div>
        </motion.div>
      </div>
    </section>
  )
}