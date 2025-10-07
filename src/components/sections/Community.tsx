import { motion } from "framer-motion"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Users, Shield, Award } from "lucide-react"

export function Community() {
  const { t } = useTranslation()

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5" />
      
      <div className="container mx-auto px-4 relative">
        <motion.div
          className="max-w-4xl mx-auto text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            {t('community.title')}
          </h2>
          
          <p className="text-xl text-muted-foreground mb-8">
            {t('community.subtitle')}
          </p>
          
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {[
              { icon: Users, value: "1,000+", label: "Profesionales" },
              { icon: Shield, value: "99.9%", label: "Confiabilidad" },
              { icon: Award, value: "4.8/5", label: "Satisfacción" }
            ].map((stat, index) => {
              const Icon = stat.icon
              return (
                <motion.div
                  key={index}
                  className="p-6"
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Icon className="w-8 h-8 mx-auto mb-4 text-primary" />
                  <div className="text-3xl font-bold text-primary mb-2">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </motion.div>
              )
            })}
          </div>
          
          <Button 
            size="lg"
            className="bg-gradient-to-r from-primary to-success hover:from-primary/90 hover:to-success/90 text-white border-0 mb-8"
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