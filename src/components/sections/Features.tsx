import { motion } from "framer-motion"
import { useTranslation } from "react-i18next"
import { Stethoscope, Zap, RefreshCw } from "lucide-react"

const features = [
  {
    icon: Stethoscope,
    key: "precision"
  },
  {
    icon: Zap,
    key: "efficiency"
  },
  {
    icon: RefreshCw,
    key: "updated"
  }
]

export function Features() {
  const { t } = useTranslation()

  return (
    <section className="py-20 md:py-32 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            {t('features.title')}
          </h2>
        </motion.div>
        
        <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.key}
                className="text-center p-8 rounded-lg bg-card border border-border hover:border-primary/50 transition-all duration-300 group"
                style={{ boxShadow: 'var(--shadow-card)' }}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -8, boxShadow: 'var(--shadow-elevated)' }}
              >
                <div className="w-14 h-14 mx-auto mb-6 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">
                  {t(`features.${feature.key}.title`)}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {t(`features.${feature.key}.desc`)}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}