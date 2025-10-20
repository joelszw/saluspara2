import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { supabase } from "@/integrations/supabase/client"
import { Sidebar } from "@/components/navigation/Sidebar"
import { Header } from "@/components/navigation/Header"
import { StatsCards } from "@/components/sections/StatsCards"
import { ConversationalChat } from "@/components/chat/ConversationalChat"
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
    <div className="min-h-screen" style={{ backgroundColor: '#282828' }}>
      {/* Sidebar */}
      <Sidebar activeSection="chat" />
      
      {/* Main Content */}
      <div className="ml-64">
        {/* Top Header */}
        <div className="sticky top-0 z-10 border-b px-8 py-4" style={{ 
          backgroundColor: '#282828',
          borderColor: '#3a3a3a'
        }}>
          <Header userEmail={userEmail} history={history} />
        </div>

        {/* Dashboard Content */}
        <main className="p-8">
          {/* Welcome Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-4xl font-bold mb-2" style={{ color: '#EDEDED' }}>
              Bienvenido de nuevo{userEmail ? `, ${userEmail.split('@')[0]}` : ''}
            </h1>
            <p className="text-lg" style={{ color: '#C8C8C8' }}>
              Tu asistente médico especializado en traumatología y ortopedia
            </p>
          </motion.div>

          {/* Stats Cards */}
          {userId && (
            <StatsCards 
              dailyCount={counts.daily} 
              monthlyCount={counts.monthly}
            />
          )}

          {/* Main Chat Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl p-8 mb-8 border"
            style={{
              backgroundColor: '#2a2a2a',
              borderColor: '#3a3a3a'
            }}
          >
            <h2 className="text-2xl font-bold mb-6" style={{ color: '#EDEDED' }}>
              Chat Médico
            </h2>
            <ConversationalChat 
              userId={userId}
              counts={counts}
              onUsageUpdate={handleUsageUpdate}
            />
          </motion.div>

          {/* Recent History */}
          {userId && history.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl p-8 border"
              style={{
                backgroundColor: '#2a2a2a',
                borderColor: '#3a3a3a'
              }}
            >
              <h2 className="text-2xl font-bold mb-6" style={{ color: '#EDEDED' }}>
                Consultas Recientes
              </h2>
              <div className="space-y-4">
                {history.slice(0, 5).map((q) => (
                  <div
                    key={q.id}
                    className="p-4 rounded-xl border transition-all hover:border-opacity-60"
                    style={{
                      backgroundColor: '#282828',
                      borderColor: '#3a3a3a'
                    }}
                  >
                    <p className="font-medium mb-2" style={{ color: '#EDEDED' }}>{q.prompt}</p>
                    {q.response && (
                      <p className="text-sm line-clamp-2 mb-2" style={{ color: '#C8C8C8' }}>
                        {q.response}
                      </p>
                    )}
                    <p className="text-xs" style={{ color: '#C8C8C8', opacity: 0.7 }}>
                      {new Date(q.timestamp).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </main>

        {/* Other Sections */}
        <div style={{ backgroundColor: '#1f1f1f' }}>
          <Features />
          <Community />
          <LLMsShowcase />
          <Freemium />
        </div>
        
        <FooterLegal />
      </div>
    </div>
  )
}

export default NewIndex