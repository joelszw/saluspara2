import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { supabase } from "@/integrations/supabase/client"
import { Header } from "@/components/navigation/Header"
import { Hero } from "@/components/sections/Hero"
import { Features } from "@/components/sections/Features"
import { Community } from "@/components/sections/Community"
import { LLMsShowcase } from "@/components/sections/LLMsShowcase"
import { Freemium } from "@/components/sections/Freemium"
import { FooterLegal } from "@/components/sections/FooterLegal"

interface QueryItem {
  id: string
  prompt: string
  response: string | null
  summary?: string | null
  timestamp: string
  pubmed_references?: any[]
  keywords?: string[]
  translated_query?: string
  search_type?: string
  selected_keyword?: string
}

const NewIndex = () => {
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [counts, setCounts] = useState<{ daily: number; monthly: number }>({ daily: 0, monthly: 0 })
  const [history, setHistory] = useState<QueryItem[]>([])

  // Auth state
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUserId(session?.user?.id ?? null)
      setUserEmail(session?.user?.email ?? null)
    })
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null)
      setUserEmail(session?.user?.email ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Load history and counters when logged in
  useEffect(() => {
    if (!userId) {
      setHistory([])
      setCounts({ daily: 0, monthly: 0 })
      return
    }
    
    const loadUserData = async () => {
      const { data, error } = await supabase
        .from("queries")
        .select("id,prompt,response,timestamp,summary,pubmed_references,keywords,translated_query,search_type,selected_keyword")
        .eq("user_id", userId)
        .order("timestamp", { ascending: false })
        .limit(30)
      if (!error && data) setHistory(data as QueryItem[])

      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      
      const [{ count: daily }, { count: monthly }] = await Promise.all([
        supabase.from("queries").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("timestamp", todayStart.toISOString()),
        supabase.from("queries").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("timestamp", monthStart.toISOString()),
      ])
      setCounts({ daily: daily ?? 0, monthly: monthly ?? 0 })
    }
    
    loadUserData()
  }, [userId])

  const handleUsageUpdate = async () => {
    if (!userId) return
    
    // Reload real counts from database
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    
    const [{ count: daily }, { count: monthly }, { data: historyData }] = await Promise.all([
      supabase.from("queries").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("timestamp", todayStart.toISOString()),
      supabase.from("queries").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("timestamp", monthStart.toISOString()),
      supabase.from("queries").select("id,prompt,response,timestamp,summary,pubmed_references,keywords,translated_query,search_type,selected_keyword").eq("user_id", userId).order("timestamp", { ascending: false }).limit(30)
    ])
    
    setCounts({ daily: daily ?? 0, monthly: monthly ?? 0 })
    if (historyData) setHistory(historyData as QueryItem[])
  }

  return (
    <div className="min-h-screen bg-background">
      <Header userEmail={userEmail} history={history} />
      
      <main>
        <Hero 
          userId={userId} 
          counts={counts} 
          onUsageUpdate={handleUsageUpdate} 
        />
        <Features />
        <Community />
        <LLMsShowcase />
        <Freemium />
        
        {/* History section for logged in users */}
        {userId && history.length > 0 && (
          <motion.section 
            className="py-20 bg-muted/10"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="container mx-auto px-4 max-w-5xl">
              <h2 className="text-3xl md:text-4xl font-bold mb-10 text-center tracking-tight">Tu historial</h2>
              <div className="space-y-3">
                {history.slice(0, 5).map((q) => (
                  <motion.div
                    key={q.id}
                    className="group p-6 bg-card border border-border/50 rounded-2xl hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                  >
                    <p className="font-medium mb-3">{q.prompt}</p>
                    {q.response && (
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {q.response}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground/70 mt-3">
                      {new Date(q.timestamp).toLocaleString()}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.section>
        )}
      </main>
      
      <FooterLegal />
    </div>
  )
}

export default NewIndex