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
    <section className="relative py-16 overflow-hidden min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      
      <div className="container mx-auto px-4 relative h-full">
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Medical illustration */}
          <motion.div 
            className="w-16 h-16 mx-auto mb-6 bg-primary rounded-2xl flex items-center justify-center shadow-lg"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <svg 
              width="32" 
              height="32" 
              viewBox="0 0 100 100" 
              className="text-primary-foreground"
              fill="currentColor"
            >
              <path d="M40 10 h20 v30 h30 v20 h-30 v30 h-20 v-30 h-30 v-20 h30 z" />
            </svg>
          </motion.div>
          
          <motion.h1 
            className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {t('hero.title')}
          </motion.h1>
          
          <motion.p 
            className="text-lg md:text-xl text-muted-foreground mb-12 max-w-3xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {t('hero.subtitle')}
          </motion.p>
        </motion.div>
        
        {/* Conversational Chat */}
        <motion.div
          className="flex-1 flex flex-col"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <ConversationalChat 
            userId={userId}
            counts={counts}
            onUsageUpdate={onUsageUpdate}
          />
        </motion.div>
      </div>
    </section>
  )
}