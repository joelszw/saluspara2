import React, { useState, useRef, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "@/hooks/use-toast"
import Turnstile from "react-turnstile"
import { ChatBubbleUser } from "./ChatBubbleUser"
import { ChatBubbleAI } from "./ChatBubbleAI"
import { FollowUpSuggestions } from "./FollowUpSuggestions"
import { ClearHistoryButton } from "./ClearHistoryButton"
import { PubMedReferencesSection } from "@/components/references/PubMedReferencesSection"

const TURNSTILE_SITE_KEY = (window as any)?.__TURNSTILE_SITE_KEY__ ?? ""

interface ChatMessage {
  id: string
  type: 'user' | 'ai'
  content: string
  summary?: string
  timestamp: string
  pubmedReferences?: any[]
  keywords?: string[]
  translatedQuery?: string
}

interface ConversationalChatProps {
  userId: string | null
  counts: { daily: number; monthly: number }
  onUsageUpdate: () => void
}

export function ConversationalChat({ userId, counts, onUsageUpdate }: ConversationalChatProps) {
  const { t } = useTranslation()
  const [prompt, setPrompt] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [guestCaptchaToken, setGuestCaptchaToken] = useState<string | null>(null)
  const messagesStartRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const guestRemaining = useMemo(() => {
    const used = Number(localStorage.getItem("guest_query_count") || "0")
    return Math.max(0, 3 - used)
  }, [messages])

  // Auto scroll to bottom when new messages arrive - Enhanced
  useEffect(() => {
    const scrollToTop = () => {
      if (messagesStartRef.current) {
        // Use smooth scrolling with a slight delay to ensure content is rendered
        setTimeout(() => {
          messagesStartRef.current?.scrollIntoView({ 
            behavior: "smooth", 
            block: "start",
            inline: "nearest"
          })
        }, 100)
      }
    }
    
    scrollToTop()
  }, [messages, loading, suggestions])

  // Load chat history from localStorage or database
  useEffect(() => {
    if (userId) {
      // For authenticated users, we could load from database if needed
      // For now, we'll use localStorage for simplicity
    }
    
    // Load from localStorage
    const savedMessages = localStorage.getItem(`chat_history_${userId || 'guest'}`)
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages))
      } catch (e) {
        console.error('Failed to load chat history:', e)
      }
    }
  }, [userId])

  // Save messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`chat_history_${userId || 'guest'}`, JSON.stringify(messages))
    }
  }, [messages, userId])

  const generateFollowUpSuggestions = async (response: string, originalPrompt: string) => {
    setLoadingSuggestions(true)
    try {
      // Generate 2-3 follow-up suggestions based on the AI response
      const { data, error } = await supabase.functions.invoke("ask-medgemma", {
        body: { 
          prompt: `Basándote en esta consulta médica: "${originalPrompt}" y su respuesta: "${response.substring(0, 500)}...", genera exactamente 3 preguntas de seguimiento cortas y específicas que el usuario podría hacer. Responde SOLO con las 3 preguntas separadas por saltos de línea, sin numeración ni explicaciones adicionales.`,
          model: "meta-llama/Llama-3.3-70B-Instruct:groq",
          skipStorage: true // Don't store this in the database
        },
      })
      
      if (!error && data?.response) {
        const suggestionsText = data.response.trim()
        const suggestionsList = suggestionsText
          .split('\n')
          .filter(s => s.trim())
          .slice(0, 3)
          .map(s => s.replace(/^\d+\.\s*/, '').trim())
        
        setSuggestions(suggestionsList)
      }
    } catch (e) {
      console.error('Failed to generate suggestions:', e)
    } finally {
      setLoadingSuggestions(false)
    }
  }

  const handleAsk = async (customPrompt?: string) => {
    const currentPrompt = customPrompt || prompt
    if (!currentPrompt.trim()) return

    // Enforce guest limit
    if (!userId) {
      const used = Number(localStorage.getItem("guest_query_count") || "0")
      if (used >= 3) {
        toast({ 
          title: t('hero.limit_reached'), 
          description: t('hero.signup_to_continue')
        })
        return
      }
    }

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: currentPrompt,
      timestamp: new Date().toISOString()
    }
    
    setMessages(prev => [...prev, userMessage])
    setPrompt("") // Clear input
    setSuggestions([]) // Clear previous suggestions
    setLoading(true)
    
    try {
      // Get PubMed references
      let pubmedContext: any[] = [];
      let extractedKeywords: string[] = [];
      let translatedQuery: string = '';
      
      try {
        const { data: pubmedData, error: pubmedError } = await supabase.functions.invoke("pubmed-search", {
          body: { prompt: currentPrompt }
        });
        
        if (!pubmedError && pubmedData?.articles) {
          pubmedContext = pubmedData.articles;
          extractedKeywords = pubmedData.keywords || [];
          translatedQuery = pubmedData.translatedQuery || '';
        }
      } catch (pubmedErr) {
        console.warn("PubMed search failed (non-fatal):", pubmedErr);
      }
      
      const { data, error } = await supabase.functions.invoke("ask-medgemma", {
        body: { 
          prompt: currentPrompt, 
          model: "meta-llama/Llama-3.3-70B-Instruct:groq", 
          captchaToken: !userId ? guestCaptchaToken ?? undefined : undefined,
          pubmedContext
        },
      })
      
      if (error) throw new Error(error.message || "Failed to get response")
      if (data?.error) {
        const details = (data as any).details ? ` — ${(data as any).details}` : ""
        throw new Error(`${data.error}${details}`)
      }
      
      const response = data?.response as string
      const queryId = data?.queryId as string
      
      // Add AI message after user message
      const aiMessage: ChatMessage = {
        id: `ai_${Date.now() + Math.random()}`,
        type: 'ai',
        content: response,
        timestamp: new Date().toISOString(),
        pubmedReferences: pubmedContext,
        keywords: extractedKeywords,
        translatedQuery: translatedQuery
      }
      
      setMessages(prev => [...prev, aiMessage])

      // Generate summary for authenticated users
      if (userId && queryId) {
        setLoadingSummary(true)
        try {
          const { data: summaryData, error: summaryError } = await supabase.functions.invoke("generate-summary", {
            body: { 
              queryId,
              prompt: currentPrompt, 
              response: response
            },
          })
          
          if (!summaryError && summaryData?.summary) {
            setMessages(prev => prev.map(msg => 
              msg.id === aiMessage.id 
                ? { ...msg, summary: summaryData.summary }
                : msg
            ))
          }
        } catch (e) {
          console.error("Error generating summary:", e)
        } finally {
          setLoadingSummary(false)
        }
      }

      // Generate follow-up suggestions
      generateFollowUpSuggestions(response, currentPrompt)

      // Update counters
      if (!userId) {
        const used = Number(localStorage.getItem("guest_query_count") || "0")
        localStorage.setItem("guest_query_count", String(used + 1))
      } else {
        onUsageUpdate()
      }
    } catch (e: any) {
      toast({ 
        title: "Error", 
        description: e.message || "No se pudo obtener respuesta." 
      })
      // Remove the user message if request failed
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id))
    } finally {
      setLoading(false)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setPrompt(suggestion)
    // Auto-submit the suggestion
    setTimeout(() => handleAsk(suggestion), 100)
  }

  const clearHistory = () => {
    setMessages([])
    setSuggestions([])
    localStorage.removeItem(`chat_history_${userId || 'guest'}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAsk()
    }
  }

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* Chat Messages - Improved container */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-h-[65vh] min-h-[400px] scrollbar-thin scrollbar-thumb-muted/50 scrollbar-track-transparent scroll-smooth"
        style={{ scrollBehavior: 'smooth' }}
      >
             <div ref={messagesStartRef} />
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12 text-muted-foreground"
          >
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-primary to-success rounded-full flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 100 100" className="text-white" fill="currentColor">
                <path d="M40 10 h20 v30 h30 v20 h-30 v30 h-20 v-30 h-30 v-20 h30 z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2">{t('chat.welcome_title')}</h3>
            <p className="text-sm">{t('chat.welcome_subtitle')}</p>
          </motion.div>
        )}

        {messages.map((message, index) => (
          <motion.div 
            key={message.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            {message.type === 'user' ? (
              <ChatBubbleUser 
                message={message.content}
                timestamp={message.timestamp}
              />
            ) : (
              <ChatBubbleAI
                message={message.content}
                summary={message.summary}
                timestamp={message.timestamp}
                loadingSummary={loadingSummary}
              />
            )}
          </motion.div>
        ))}

        {loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <ChatBubbleAI
              message=""
              timestamp={new Date().toISOString()}
              isLoading={true}
            />
          </motion.div>
        )}

        {/* Follow-up suggestions */}
        {suggestions.length > 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <FollowUpSuggestions
              suggestions={suggestions}
              onSuggestionClick={handleSuggestionClick}
              isLoading={loadingSuggestions}
            />
          </motion.div>
        )}

        {/* Show PubMed References at the bottom after all messages and suggestions */}
        {messages.length > 0 && messages[messages.length - 1]?.type === 'ai' && 
         messages[messages.length - 1]?.pubmedReferences && 
         messages[messages.length - 1]?.pubmedReferences!.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <PubMedReferencesSection 
              articles={messages[messages.length - 1]!.pubmedReferences!}
              keywords={messages[messages.length - 1]?.keywords || []}
              translatedQuery={messages[messages.length - 1]?.translatedQuery}
            />
          </motion.div>
        )}

   
      </div>

      {/* Input Area - Sticky with improved backdrop */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t px-4 py-4 shadow-lg">
        <div className="flex flex-col gap-3">
          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {userId ? (
                <span>{t('hero.daily_monthly', { daily: counts.daily, monthly: counts.monthly })}</span>
              ) : (
                <span>{t('hero.guest_remaining', { count: guestRemaining })}</span>
              )}
            </div>
            
            {messages.length > 0 && (
              <ClearHistoryButton onClear={clearHistory} disabled={loading} />
            )}
          </div>

          {/* Input */}
          <div className="flex flex-col gap-3">
            {!userId && TURNSTILE_SITE_KEY && (
              <div className="flex justify-center">
                <Turnstile
                  sitekey={TURNSTILE_SITE_KEY}
                  onVerify={(t) => setGuestCaptchaToken(t)}
                  onExpire={() => setGuestCaptchaToken(null)}
                  theme="auto"
                />
              </div>
            )}
            
            <div className="flex gap-2">
              <Textarea
                placeholder={t('hero.placeholder')}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[120px] max-h-[300px] resize-none text-base leading-relaxed transition-all duration-200 focus:min-h-[160px]"
                rows={6}
                disabled={loading}
              />
              
              <Button
                size="lg"
                className="bg-gradient-to-r from-primary to-success hover:from-primary/90 hover:to-success/90 text-white border-0 min-w-[100px]"
                disabled={!prompt.trim() || loading || (!userId && (!TURNSTILE_SITE_KEY || !guestCaptchaToken))}
                onClick={() => handleAsk()}
              >
                {loading ? t('hero.consulting') : t('hero.submit')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}