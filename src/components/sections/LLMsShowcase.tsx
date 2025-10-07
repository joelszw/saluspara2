import { motion } from "framer-motion"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"

const llms = [
  { name: "MedGemma", status: "active" },
  { name: "Med42", status: "coming" },
  { name: "Meditron", status: "coming" },
  { name: "BioGPT", status: "coming" },
  { name: "GatorTron", status: "coming" },
  { name: "Clinical Camel", status: "coming" }
]

export function LLMsShowcase() {
  const { t } = useTranslation()

  return (
    <section className="py-20 md:py-32 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Badge variant="secondary" className="mb-4 text-xs font-medium px-3 py-1">
            {t('llms.updated')}
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            {t('llms.title')}
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            {t('llms.subtitle')}
          </p>
        </motion.div>
        
        <div className="max-w-5xl mx-auto">
          <motion.div 
            className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {llms.map((llm, index) => (
              <motion.div
                key={llm.name}
                className="relative p-6 bg-card border border-border rounded-lg text-center hover:border-primary/50 transition-all duration-300 group"
                style={{ boxShadow: 'var(--shadow-card)' }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -4, boxShadow: 'var(--shadow-elevated)' }}
              >
                {llm.status === 'active' && (
                  <div className="absolute top-3 right-3">
                    <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                  </div>
                )}
                
                {/* Placeholder logo */}
                <div className="w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <div className="w-6 h-6 bg-primary/40 rounded" />
                </div>
                
                <h3 className="font-bold text-sm mb-3">{llm.name}</h3>
                
                <Badge 
                  variant={llm.status === 'active' ? 'default' : 'secondary'}
                  className="text-xs px-3"
                >
                  {llm.status === 'active' ? 'Activo' : 'Próximamente'}
                </Badge>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}