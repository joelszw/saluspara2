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
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            {t('llms.title')}
          </h2>
          <p className="text-xl text-muted-foreground mb-4">
            {t('llms.subtitle')}
          </p>
          <Badge variant="secondary" className="text-sm">
            {t('llms.updated')}
          </Badge>
        </motion.div>
        
        <div className="max-w-4xl mx-auto">
          <motion.div 
            className="grid grid-cols-2 md:grid-cols-3 gap-6"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {llms.map((llm, index) => (
              <motion.div
                key={llm.name}
                className="relative p-6 bg-card border rounded-xl text-center hover:shadow-lg transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                {llm.status === 'active' && (
                  <div className="absolute -top-2 -right-2">
                    <div className="w-4 h-4 bg-success rounded-full animate-pulse" />
                  </div>
                )}
                
                {/* Placeholder logo */}
                <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg flex items-center justify-center">
                  <div className="w-6 h-6 bg-gradient-to-br from-primary to-secondary rounded" />
                </div>
                
                <h3 className="font-semibold text-sm mb-2">{llm.name}</h3>
                
                <Badge 
                  variant={llm.status === 'active' ? 'default' : 'secondary'}
                  className="text-xs"
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