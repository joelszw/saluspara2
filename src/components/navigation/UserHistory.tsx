import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { History, Clock, ChevronDown } from "lucide-react"
import { MedicalTermsTooltip } from "@/components/medical/MedicalTermsTooltip"
import { ExportHistoryControls } from "@/components/navigation/ExportHistoryControls"

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

interface UserHistoryProps {
  history: QueryItem[]
}

export function UserHistory({ history }: UserHistoryProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedQuery, setSelectedQuery] = useState<QueryItem | null>(null)

  if (!history.length) return null

  const formatResponse = (text: string) => {
    return text
      .replace(/\n/g, '<br>')
      .replace(/\*\s/g, '<br>• ')
      .replace(/(\d+\.\s)/g, '<br>$1')
      .replace(/^\s*<br>/, '')
  }

  return (
    <>
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2"
        >
          <History className="h-4 w-4" />
          <span className="hidden md:inline">Historial</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 top-full mt-2 w-80 bg-popover border rounded-md shadow-lg z-50 flex flex-col max-h-[80vh]"
            >
              <div className="p-4 border-b bg-popover">
                <h3 className="font-semibold flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Tu historial reciente
                </h3>
              </div>
              
              <ScrollArea className="flex-1 min-h-0 max-h-[400px]">
                <div className="p-4 space-y-2">
                  {history.map((query) => (
                    <Dialog key={query.id}>
                      <DialogTrigger asChild>
                        <Card 
                          className="cursor-pointer hover:bg-muted/50 transition-colors p-3"
                          onClick={() => setSelectedQuery(query)}
                        >
                          <div className="space-y-1">
                            <p className="text-sm font-medium line-clamp-2">
                              {query.prompt}
                            </p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {new Date(query.timestamp).toLocaleDateString('es-ES', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </Card>
                      </DialogTrigger>
                      
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
                        <DialogHeader>
                          <DialogTitle className="text-left">Consulta médica</DialogTitle>
                        </DialogHeader>
                        <ScrollArea className="max-h-[60vh]">
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-semibold text-primary mb-2">Pregunta:</h4>
                              <p className="text-sm bg-muted p-3 rounded-md">{query.prompt}</p>
                            </div>
                            
                            {query.response && (
                              <div>
                                <h4 className="font-semibold text-primary mb-2">Respuesta:</h4>
                                <div className="text-sm bg-card border p-4 rounded-md prose prose-sm max-w-none dark:prose-invert">
                                  <MedicalTermsTooltip text={formatResponse(query.response)} />
                                </div>
                              </div>
                            )}

                            {query.summary && (
                              <div>
                                <h4 className="font-semibold text-success mb-2 flex items-center gap-2">
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                  </svg>
                                  Resumen Clínico
                                </h4>
                                <div className="text-sm bg-muted/30 border rounded-md p-4">
                                  <MedicalTermsTooltip 
                                    text={query.summary.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')}
                                  />
                                </div>
                              </div>
                            )}

                            {query.pubmed_references && query.pubmed_references.length > 0 && (
                              <div>
                                <h4 className="font-semibold text-blue-600 mb-2">Referencias PubMed</h4>
                                <div className="text-sm bg-blue-50 border border-blue-200 rounded-md p-3 space-y-2">
                                  {query.pubmed_references.slice(0, 3).map((ref: any, index: number) => (
                                    <div key={index} className="border-b border-blue-200 last:border-b-0 pb-2 last:pb-0">
                                      <p className="font-medium text-blue-800">{ref.title || 'Sin título'}</p>
                                      <p className="text-xs text-blue-600">
                                        PMID: {ref.pmid || 'N/A'} • {ref.year || 'Año no disponible'}
                                      </p>
                                    </div>
                                  ))}
                                  {query.pubmed_references.length > 3 && (
                                    <p className="text-xs text-blue-600 italic">
                                      ... y {query.pubmed_references.length - 3} referencias más
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}

                            {query.keywords && query.keywords.length > 0 && (
                              <div>
                                <h4 className="font-semibold text-purple-600 mb-2">Palabras Clave</h4>
                                <div className="flex flex-wrap gap-1">
                                  {query.keywords.map((keyword: string, index: number) => (
                                    <span 
                                      key={index}
                                      className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full"
                                    >
                                      {keyword}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            <div className="text-xs text-muted-foreground pt-2 border-t">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(query.timestamp).toLocaleString('es-ES')}
                              </div>
                            </div>
                          </div>
                        </ScrollArea>
                      </DialogContent>
                    </Dialog>
                  ))}
                </div>
              </ScrollArea>
              
              {/* Export Controls - Fixed at bottom */}
              <div className="border-t bg-popover">
                <ExportHistoryControls />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}