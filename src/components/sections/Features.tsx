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
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t('features.title')}
          </h2>
        </motion.div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.key}
                className="text-center p-6 rounded-xl bg-card/50 backdrop-blur-sm border hover:shadow-lg transition-all duration-300"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-primary to-success rounded-full flex items-center justify-center">
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-4">
                  {t(`features.${feature.key}.title`)}
                </h3>
                <p className="text-muted-foreground">
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