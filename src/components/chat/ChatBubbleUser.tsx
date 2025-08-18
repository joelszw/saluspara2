import React from "react"
import { motion } from "framer-motion"

interface ChatBubbleUserProps {
  message: string
  timestamp: string
}

export function ChatBubbleUser({ message, timestamp }: ChatBubbleUserProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="flex justify-end mb-4"
    >
      <div className="flex flex-col max-w-[80%] sm:max-w-[70%]">
        <div className="bg-primary text-primary-foreground rounded-lg rounded-tr-sm px-4 py-3 shadow-sm">
          <p className="text-sm whitespace-pre-wrap break-words">{message}</p>
        </div>
        <span className="text-xs text-muted-foreground mt-1 text-right">
          {new Date(timestamp).toLocaleTimeString()}
        </span>
      </div>
    </motion.div>
  )
}