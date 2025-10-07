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
      
      <main className="pt-16">
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
            className="py-16 bg-muted/30"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold mb-8 text-center">Tu historial</h2>
                <div className="space-y-4">
                  {history.slice(0, 5).map((q) => (
                    <motion.div
                      key={q.id}
                      className="p-4 bg-card border rounded-lg"
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                    >
                      <p className="text-sm font-medium mb-2">{q.prompt}</p>
                      {q.response && (
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {q.response}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(q.timestamp).toLocaleString()}
                      </p>
                    </motion.div>
                  ))}
                </div>
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