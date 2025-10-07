import { motion } from "framer-motion"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Users, Shield, Award } from "lucide-react"

export function Community() {
  const { t } = useTranslation()

  return (
    <section className="py-20 md:py-32 relative overflow-hidden bg-muted/20">
      
      <div className="container mx-auto px-4 relative">
        <motion.div
          className="max-w-5xl mx-auto text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-8">
            {t('community.title')}
          </h2>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-16 max-w-3xl mx-auto">
            {t('community.subtitle')}
          </p>
          
          <div className="grid md:grid-cols-3 gap-12 mb-16">
            {[
              { icon: Users, value: "1,000+", label: "Profesionales" },
              { icon: Shield, value: "99.9%", label: "Confiabilidad" },
              { icon: Award, value: "4.8/5", label: "Satisfacción" }
            ].map((stat, index) => {
              const Icon = stat.icon
              return (
                <motion.div
                  key={index}
                  className="flex flex-col items-center"
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Icon className="w-10 h-10 mb-4 text-primary" />
                  <div className="text-5xl md:text-6xl font-bold mb-3">{stat.value}</div>
                  <div className="text-base text-muted-foreground font-medium">{stat.label}</div>
                </motion.div>
              )
            })}
          </div>
          
          <Button 
            variant="hero"
            size="lg"
            className="mb-12 px-8 text-base"
          >
            {t('community.cta')}
          </Button>
          
          <motion.div
            className="max-w-2xl mx-auto p-4 bg-muted/50 rounded-lg border"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <p className="text-sm text-muted-foreground italic">
              {t('community.disclaimer')}
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}