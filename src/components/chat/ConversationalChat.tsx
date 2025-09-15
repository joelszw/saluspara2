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
  searchType?: 'AND' | 'OR'
  selectedKeyword?: string
  canContinue?: boolean
  originalLength?: number
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
  const [turnstileWidget, setTurnstileWidget] = useState<any>(null)
  const [guestUsed, setGuestUsed] = useState(() => Number(localStorage.getItem("guest_query_count") || "0"))
  
  const guestRemaining = useMemo(() => {
    return Math.max(0, 3 - guestUsed)
  }, [guestUsed])

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    const scrollToTop = () => {
      if (messagesStartRef.current) {
        setTimeout(() => {
          messagesStartRef.current?.scrollIntoView({ 
            behavior: "smooth", 
            block: "start",
            inline: "nearest"
          })
        }, 100)
      }
    }
    
    // Don't scroll when loading is in progress (to prevent jumping during continuations)
    if (!loading) {
      scrollToTop()
    }
  }, [messages, suggestions])

  // Load chat history from localStorage
  useEffect(() => {
    const savedMessages = localStorage.getItem(`chat_history_${userId || 'guest'}`)
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages))
      } catch (e) {
        console.error('Failed to load chat history:', e)
      }
    }
  }, [userId])

  // Sync guest usage with localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      setGuestUsed(Number(localStorage.getItem("guest_query_count") || "0"))
    }
    
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  // Save messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`chat_history_${userId || 'guest'}`, JSON.stringify(messages))
    }
  }, [messages, userId])

  const generateFollowUpSuggestions = async (response: string, originalPrompt: string) => {
    console.log("🤖 STARTING suggestion generation for prompt:", originalPrompt.substring(0, 100))
    setLoadingSuggestions(true)
    try {
      const { data, error } = await supabase.functions.invoke("ask-medgemma", {
        body: { 
          prompt: `Basándote en esta respuesta: "${response.substring(0, 200)}..." sugiere 3 preguntas de seguimiento cortas sobre traumatología. Una por línea, sin números.`,
          model: "meta-llama/Llama-3.3-70B-Instruct:groq",
          skipStorage: true
        },
      })
      
      console.log("🤖 Suggestion generation response:", { error, hasData: !!data, hasResponse: !!data?.response })
      
      if (error) {
        console.error("❌ Error generating suggestions:", error)
        return
      }
      
      if (!data?.response) {
        console.warn("⚠️ No response from suggestion generation")
        return
      }
      
      const suggestionsText = data.response.trim()
      console.log("🤖 Raw suggestions text:", suggestionsText)
      
      const suggestionsList = suggestionsText
        .split('\n')
        .filter(s => s.trim())
        .slice(0, 3)
        .map(s => s.replace(/^\d+\.\s*/, '').trim())
      
      console.log("🤖 Processed suggestions:", suggestionsList)
      setSuggestions(suggestionsList)
    } catch (e) {
      console.error('❌ Failed to generate suggestions:', e)
    } finally {
      setLoadingSuggestions(false)
    }
  }

  const handleAsk = async (inputPrompt?: string, isContinuation = false, previousMessageIndex?: number, previousResponseText?: string) => {
    const currentPrompt = inputPrompt || prompt.trim()
    if (!currentPrompt && !isContinuation) return

    // Get the previous response if this is a continuation
    const previousResponse = previousResponseText || (isContinuation && previousMessageIndex !== undefined 
      ? messages[previousMessageIndex]?.content 
      : undefined)

    setLoading(true)
    setSuggestions([])

    // Add user message only if this is not a continuation
    let userMessage: ChatMessage | undefined
    if (!isContinuation) {
      // Enforce guest limit
      if (!userId) {
        const used = Number(localStorage.getItem("guest_query_count") || "0")
        if (used >= 3) {
          toast({ 
            title: t('hero.limit_reached'), 
            description: t('hero.signup_to_continue')
          })
          setLoading(false)
          return
        }
      }

      userMessage = {
        id: `user_${Date.now()}`,
        type: 'user',
        content: currentPrompt,
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, userMessage])
      setPrompt("")
    }
    
    try {
      // Get PubMed references only for new queries (not continuations)
      let pubmedContext: any[] = [];
      let extractedKeywords: string[] = [];
      let translatedQuery: string = '';
      let searchType: 'AND' | 'OR' | undefined = undefined;
      let selectedKeyword: string | undefined = undefined;
      
      if (!isContinuation) {
        try {
          const { data: pubmedData, error: pubmedError } = await supabase.functions.invoke("pubmed-search", {
            body: { prompt: currentPrompt }
          });
          
          if (!pubmedError && pubmedData?.articles) {
            pubmedContext = pubmedData.articles;
            extractedKeywords = pubmedData.keywords || [];
            translatedQuery = pubmedData.translatedQuery || '';
            searchType = pubmedData.searchType;
            selectedKeyword = pubmedData.selectedKeyword;
          }
        } catch (pubmedErr) {
          console.warn("PubMed search failed (non-fatal):", pubmedErr);
        }
      }
      
      console.log('Calling ask-medgemma function...', { 
        isContinuation,
        userId: !!userId,
        skipStorage: !userId,
        currentPrompt,
        previousResponseLength: previousResponse?.length,
        hasGuestToken: !!guestCaptchaToken
      });
      
      const requestBody = { 
        prompt: currentPrompt, 
        captchaToken: (!userId && !isContinuation) ? guestCaptchaToken ?? undefined : undefined,
        pubmedContext,
        skipStorage: !userId,
        continueResponse: isContinuation,
        previousResponse: previousResponse
      };
      
      console.log('Request body for ask-medgemma:', JSON.stringify(requestBody, null, 2));
      
      const { data, error } = await supabase.functions.invoke("ask-medgemma", {
        body: requestBody,
      })
      
      console.log('Response from ask-medgemma:', { data, error, hasData: !!data, hasError: !!error });
      
      if (error) {
        console.error('Edge function error details:', {
          error,
          message: error.message,
          stack: error.stack,
          toString: error.toString(),
          type: typeof error,
          isContinuation
        });
        const errorMessage = error.message || error.toString();
        
        // Handle specific continuation errors
        if (isContinuation && errorMessage.includes('400')) {
          throw new Error('Error al continuar la respuesta. Por favor, inicia una nueva consulta.');
        }
        
        throw new Error(`Error de función: ${errorMessage}`);
      }
      if (data?.error) {
        console.error('Response error:', data);
        const details = (data as any).details ? ` — ${(data as any).details}` : "";
        throw new Error(`${data.error}${details}`);
      }
      
      const response = data?.response as string
      const queryId = data?.queryId as string
      
      // Create or update AI message
      const aiMessage: ChatMessage = {
        id: isContinuation && previousMessageIndex !== undefined ? messages[previousMessageIndex].id : `ai_${Date.now() + Math.random()}`,
        type: 'ai',
        content: isContinuation && previousMessageIndex !== undefined 
          ? messages[previousMessageIndex].content + ' ' + response 
          : response,
        timestamp: new Date().toISOString(),
        pubmedReferences: isContinuation && previousMessageIndex !== undefined 
          ? messages[previousMessageIndex].pubmedReferences 
          : pubmedContext,
        keywords: extractedKeywords,
        translatedQuery: translatedQuery,
        searchType: searchType,
        selectedKeyword: selectedKeyword,
        canContinue: data?.canContinue,
        originalLength: isContinuation && previousMessageIndex !== undefined 
          ? messages[previousMessageIndex].content.length 
          : undefined
      }

      if (isContinuation && previousMessageIndex !== undefined) {
        // Update the existing AI message with the continued content
        setMessages(prev => prev.map((msg, index) => 
          index === previousMessageIndex ? aiMessage : msg
        ))
      } else {
        // Add new AI message
        setMessages(prev => [...prev, aiMessage])
      }

      // Generate summary for authenticated users
      if (userId && queryId && !isContinuation) {
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

      // Generate follow-up suggestions only for new responses (not continuations)
      if (!isContinuation) {
        await generateFollowUpSuggestions(response, currentPrompt)
      }

      // Update counters
      if (!userId) {
        const used = Number(localStorage.getItem("guest_query_count") || "0")
        const newUsed = used + 1
        localStorage.setItem("guest_query_count", String(newUsed))
        setGuestUsed(newUsed) // Update state immediately
        // Reset Turnstile after successful submission to prevent token reuse
        if (turnstileWidget) {
          turnstileWidget.reset()
          setGuestCaptchaToken(null)
        }
      } else {
        onUsageUpdate()
      }
    } catch (e: any) {
      console.error("Error in handleAsk:", e);
      const errorMessage = e.message || "No se pudo obtener respuesta";
      console.error("Detailed error info:", { error: e, errorMessage });
      
      toast({ 
        title: "Error", 
        description: errorMessage.includes('Error 202') 
          ? "Error 202: Problema de conectividad. Por favor, inténtalo de nuevo." 
          : errorMessage
      });
      
      // Remove the user message if request failed and it was added
      if (userMessage) {
        setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
      }
    } finally {
      setLoading(false)
    }
  }

  const handleContinueResponse = async (messageIndex: number) => {
    const message = messages[messageIndex]
    if (message?.type === 'ai') {
      // Find the original user prompt for this AI response
      let userPrompt = "";
      
      // Look backwards to find the most recent user message
      for (let i = messageIndex - 1; i >= 0; i--) {
        if (messages[i]?.type === 'user') {
          userPrompt = messages[i].content;
          break;
        }
      }
      
      if (userPrompt) {
        console.log('Continuing response for message:', messageIndex, 'with prompt:', userPrompt.substring(0, 50) + '...');
        // For continuations, don't require new captcha validation
        await handleAsk(userPrompt, true, messageIndex, message.content);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se encontró la pregunta original para continuar la respuesta.",
        });
      }
    }
  }

  const clearHistory = () => {
    setMessages([])
    setSuggestions([])
    localStorage.removeItem(`chat_history_${userId || 'guest'}`)
  }

  const handleSuggestionClick = (suggestion: string) => {
    setPrompt(suggestion)
    setTimeout(() => handleAsk(suggestion), 100)
  }

  const shouldShowContinueButton = (message: ChatMessage, index: number): boolean => {
    // Only rely on server-side canContinue flag
    return message.canContinue === true;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAsk()
    }
  }

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* Chat Messages */}
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
              <>
                <ChatBubbleAI
                  message={message.content}
                  summary={message.summary}
                  timestamp={message.timestamp}
                  loadingSummary={loadingSummary}
                  isContinuation={message.originalLength !== undefined}
                  originalLength={message.originalLength}
                  references={message.pubmedReferences}
                />
                {shouldShowContinueButton(message, index) && !loading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2"
                  >
                    <Button
                      onClick={() => handleContinueResponse(index)}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      {t('continueResponse', 'Continuar respuesta')}
                    </Button>
                  </motion.div>
                )}
              </>
            )}
          </motion.div>
        ))}
        
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center"
          >
            <div className="flex items-center space-x-2 text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span className="text-sm">{t('thinking', 'Pensando...')}</span>
            </div>
          </motion.div>
        )}

        {/* Show PubMed References first - only for original messages, not continuations */}
        {(() => {
          const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
          console.log('Debug PubMed Section:', {
            hasMessages: messages.length > 0,
            lastMessageType: lastMessage?.type,
            hasPubmedRefs: !!lastMessage?.pubmedReferences,
            pubmedRefsLength: lastMessage?.pubmedReferences?.length || 0,
            originalLength: lastMessage?.originalLength,
            shouldShow: messages.length > 0 && lastMessage?.type === 'ai' && 
                       lastMessage?.pubmedReferences && 
                       lastMessage?.pubmedReferences.length > 0 && 
                       lastMessage?.originalLength === undefined
          });
          
          return messages.length > 0 && lastMessage?.type === 'ai' && 
                 lastMessage?.pubmedReferences && 
                 lastMessage?.pubmedReferences.length > 0 && 
                 lastMessage?.originalLength === undefined;
        })() && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <PubMedReferencesSection 
              articles={messages[messages.length - 1]!.pubmedReferences!}
              keywords={messages[messages.length - 1]?.keywords || []}
              translatedQuery={messages[messages.length - 1]?.translatedQuery}
              searchType={messages[messages.length - 1]?.searchType}
              selectedKeyword={messages[messages.length - 1]?.selectedKeyword}
            />
          </motion.div>
        )}

        {/* Follow-up suggestions - NOW AFTER PubMed references */}
        {suggestions.length > 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mb-4"
          >
            <FollowUpSuggestions
              suggestions={suggestions}
              onSuggestionClick={handleSuggestionClick}
              isLoading={loadingSuggestions}
            />
          </motion.div>
        )}
      </div>

      {/* Input Area */}
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
                  onLoad={(widgetId, widget) => setTurnstileWidget(widget)}
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