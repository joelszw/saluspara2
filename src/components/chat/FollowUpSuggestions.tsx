import React from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"

interface FollowUpSuggestionsProps {
  suggestions: string[]
  onSuggestionClick: (suggestion: string) => void
  isLoading?: boolean
}

export function FollowUpSuggestions({ suggestions, onSuggestionClick, isLoading }: FollowUpSuggestionsProps) {
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex justify-start mb-4"
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="animate-spin rounded-full h-3 w-3 border-2 border-primary border-t-transparent"></div>
          <span className="text-xs">Generando sugerencias...</span>
        </div>
      </motion.div>
    )
  }

  if (!suggestions.length) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="flex justify-start mb-6"
    >
      <div className="max-w-[80%] sm:max-w-[70%]">
        <div className="mb-2">
          <span className="text-xs text-muted-foreground">Preguntas relacionadas:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: index * 0.1 }}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSuggestionClick(suggestion)}
                className="text-xs h-auto py-2 px-3 rounded-full border-primary/20 hover:border-primary hover:bg-primary/5 transition-colors"
              >
                {suggestion}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}