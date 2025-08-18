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
    <section className="relative py-12 overflow-hidden min-h-screen">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5" />
      
      <div className="container mx-auto px-4 relative h-full">
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Medical illustration */}
          <motion.div 
            className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary to-success rounded-full flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <svg 
              width="40" 
              height="40" 
              viewBox="0 0 100 100" 
              className="text-white"
              fill="currentColor"
            >
              <path d="M40 10 h20 v30 h30 v20 h-30 v30 h-20 v-30 h-30 v-20 h30 z" />
            </svg>
          </motion.div>
          
          <motion.h1 
            className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-success bg-clip-text text-transparent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {t('hero.title')}
          </motion.h1>
          
          <motion.p 
            className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto"
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