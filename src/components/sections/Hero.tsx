import React, { useState, useMemo } from "react"
import { motion } from "framer-motion"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "@/hooks/use-toast"
import DOMPurify from "dompurify"
import Turnstile from "react-turnstile"

const TURNSTILE_SITE_KEY = (window as any)?.__TURNSTILE_SITE_KEY__ ?? ""

interface HeroProps {
  userId: string | null
  counts: { daily: number; monthly: number }
  onUsageUpdate: () => void
}

export function Hero({ userId, counts, onUsageUpdate }: HeroProps) {
  const { t } = useTranslation()
  const [prompt, setPrompt] = useState("")
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<string>("")
  const [summary, setSummary] = useState<string>("")
  const [guestCaptchaToken, setGuestCaptchaToken] = useState<string | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)

  const guestRemaining = useMemo(() => {
    const used = Number(localStorage.getItem("guest_query_count") || "0")
    return Math.max(0, 3 - used)
  }, [response])

  const handleAsk = async () => {
    if (!prompt.trim()) return

    // Enforce guest limit on client
    if (!userId) {
      const used = Number(localStorage.getItem("guest_query_count") || "0")
      if (used >= 3) {
        toast({ 
          title: "Límite alcanzado", 
          description: "Regístrate o inicia sesión gratis para seguir usando." 
        })
        return
      }
    }

    setLoading(true)
    setResponse("")
    setSummary("")
    
    try {
      const { data, error } = await supabase.functions.invoke("ask-medgemma", {
        body: { 
          prompt, 
          model: "meta-llama/Llama-3.3-70B-Instruct:groq", 
          captchaToken: !userId ? guestCaptchaToken ?? undefined : undefined 
        },
      })
      
      if (error) throw new Error(error.message || "Fallo al invocar la función.")
      if (data?.error) {
        const details = (data as any).details ? ` — ${(data as any).details}` : ""
        throw new Error(`${data.error}${details}`)
      }
      
      const text = data?.response as string
      const queryId = data?.queryId as string
      setResponse(text)

      // Generate summary if user is authenticated and we have a query ID
      if (userId && queryId) {
        setLoadingSummary(true)
        try {
          const { data: summaryData, error: summaryError } = await supabase.functions.invoke("generate-summary", {
            body: { 
              queryId,
              prompt, 
              response: text
            },
          })
          
          if (!summaryError && summaryData?.summary) {
            setSummary(summaryData.summary)
          }
        } catch (e) {
          console.error("Error generating summary:", e)
        } finally {
          setLoadingSummary(false)
        }
      }

      // Update guest counter or refresh user data
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
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5" />
      
      <div className="container mx-auto px-4 relative">
        <motion.div 
          className="max-w-4xl mx-auto text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Medical illustration placeholder - would be replaced with actual SVG */}
          <motion.div 
            className="w-32 h-32 mx-auto mb-8 bg-gradient-to-br from-primary to-success rounded-full flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <svg 
              width="80" 
              height="80" 
              viewBox="0 0 100 100" 
              className="text-white"
              fill="currentColor"
            >
              {/* Simple medical cross */}
              <path d="M40 10 h20 v30 h30 v20 h-30 v30 h-20 v-30 h-30 v-20 h30 z" />
            </svg>
          </motion.div>
          
          <motion.h1 
            className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-success bg-clip-text text-transparent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {t('hero.title')}
          </motion.h1>
          
          <motion.p 
            className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {t('hero.subtitle')}
          </motion.p>
          
          {/* Query box */}
          <motion.div 
            className="max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <div className="rounded-xl border bg-card/50 backdrop-blur-sm p-6 shadow-lg">
              <Textarea
                placeholder={t('hero.placeholder')}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[120px] mb-4"
              />
              
              <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between gap-4">
                <div className="text-sm text-muted-foreground">
                  {userId ? (
                    <span>{t('hero.daily_monthly', { daily: counts.daily, monthly: counts.monthly })}</span>
                  ) : (
                    <span>{t('hero.guest_remaining', { count: guestRemaining })}</span>
                  )}
                </div>
                
                <div className="flex flex-col items-end gap-3">
                  {!userId && TURNSTILE_SITE_KEY && (
                    <Turnstile
                      sitekey={TURNSTILE_SITE_KEY}
                      onVerify={(t) => setGuestCaptchaToken(t)}
                      onExpire={() => setGuestCaptchaToken(null)}
                      theme="auto"
                    />
                  )}
                  
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-primary to-success hover:from-primary/90 hover:to-success/90 text-white border-0"
                    disabled={!prompt.trim() || loading || (!userId && (!TURNSTILE_SITE_KEY || !guestCaptchaToken))}
                    onClick={handleAsk}
                  >
                    {loading ? t('hero.consulting') : t('hero.submit')}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* Response display */}
          {response && (
            <motion.div 
              className="max-w-2xl mx-auto mt-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="rounded-xl border bg-card p-6 text-left space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-3 text-primary">Respuesta Médica</h3>
                  <div
                    className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ 
                      __html: DOMPurify.sanitize(
                        response
                          .replace(/\n/g, '<br>')
                          .replace(/\*\s/g, '<br>• ')
                          .replace(/(\d+\.\s)/g, '<br>$1')
                          .replace(/^\s*<br>/, ''), 
                        { 
                          ALLOWED_TAGS: ["b","strong","i","em","u","br","p","ul","ol","li","h1","h2","h3","code","pre","blockquote","a"], 
                          ALLOWED_ATTR: ["href","title","target","rel"] 
                        }
                      ) 
                    }}
                  />
                </div>

                {/* Summary section for authenticated users */}
                {userId && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-lg mb-3 text-success flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      Resumen Clínico
                    </h3>
                    {loadingSummary ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
                        Generando resumen automático...
                      </div>
                    ) : summary ? (
                      <div 
                        className="prose prose-sm max-w-none dark:prose-invert text-sm bg-muted/30 rounded-lg p-4 whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ 
                          __html: DOMPurify.sanitize(
                            summary.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>'),
                            { 
                              ALLOWED_TAGS: ["b","strong","i","em","u","br","p"], 
                              ALLOWED_ATTR: [] 
                            }
                          ) 
                        }}
                      />
                    ) : null}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  )
}