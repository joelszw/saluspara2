import React from "react"
import { motion } from "framer-motion"
import DOMPurify from "dompurify"
import { MedicalTermsTooltip } from "@/components/medical/MedicalTermsTooltip"

interface ChatBubbleAIProps {
  message: string
  summary?: string
  timestamp: string
  isLoading?: boolean
  loadingSummary?: boolean
  isContinuation?: boolean
  originalLength?: number
}

export function ChatBubbleAI({ message, summary, timestamp, isLoading, loadingSummary, isContinuation, originalLength }: ChatBubbleAIProps) {
  const formatMessage = (text: string) => {
    return DOMPurify.sanitize(
      text
        .replace(/\n/g, '<br>')
        .replace(/\*\s/g, '<br>• ')
        .replace(/(\d+\.\s)/g, '<br>$1')
        .replace(/^\s*<br>/, ''), 
      { 
        ALLOWED_TAGS: ["b","strong","i","em","u","br","p","ul","ol","li","h1","h2","h3","code","pre","blockquote","a"], 
        ALLOWED_ATTR: ["href","title","target","rel"] 
      }
    )
  }

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="flex justify-start mb-4"
      >
        <div className="flex flex-col max-w-[80%] sm:max-w-[70%]">
          <div className="bg-card border rounded-lg rounded-tl-sm px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
              <span className="text-sm">Consultando información médica...</span>
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="flex justify-start mb-4"
    >
      <div className="flex flex-col max-w-[80%] sm:max-w-[70%]">
        <div className="bg-card border rounded-lg rounded-tl-sm px-4 py-3 shadow-sm space-y-4">
          {/* Main response */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-gradient-to-br from-primary to-success rounded-full flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 100 100" className="text-white" fill="currentColor">
                  <path d="M40 10 h20 v30 h30 v20 h-30 v30 h-20 v-30 h-30 v-20 h30 z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-primary">Respuesta Médica</span>
            </div>
            <div className="prose prose-sm max-w-none dark:prose-invert text-sm">
              {isContinuation && originalLength ? (
                <>
                  <MedicalTermsTooltip text={formatMessage(message.substring(0, originalLength))} />
                  <div className="border-t border-border/50 my-4 pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-primary">
                        <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                      </svg>
                      <span className="text-sm font-medium text-primary">Continuación a la respuesta</span>
                    </div>
                    <MedicalTermsTooltip text={formatMessage(message.substring(originalLength + 1))} />
                  </div>
                </>
              ) : (
                <MedicalTermsTooltip text={formatMessage(message)} />
              )}
            </div>
          </div>

          {/* Summary section */}
          {(summary || loadingSummary) && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-success">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span className="text-sm font-medium text-success">Resumen Clínico</span>
              </div>
              {loadingSummary ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent"></div>
                  <span className="text-xs">Generando resumen automático...</span>
                </div>
              ) : summary ? (
                <div 
                  className="text-xs bg-muted/30 rounded-md p-3 whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ 
                    __html: DOMPurify.sanitize(
                      summary.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>'),
                      { ALLOWED_TAGS: ["b","strong","i","em","u","br","p"], ALLOWED_ATTR: [] }
                    ) 
                  }}
                />
              ) : null}
            </div>
          )}
        </div>
        <span className="text-xs text-muted-foreground mt-1">
          {new Date(timestamp).toLocaleTimeString()}
        </span>
      </div>
    </motion.div>
  )
}