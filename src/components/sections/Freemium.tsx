import { motion } from "framer-motion"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Check, CreditCard } from "lucide-react"

export function Freemium() {
  const { t } = useTranslation()

  return (
    <section className="py-20 md:py-32 bg-muted/20">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            {t('freemium.title')}
          </h2>
        </motion.div>
        
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            {/* Free Plan */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card className="relative h-full border-border" style={{ boxShadow: 'var(--shadow-card)' }}>
                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl font-bold mb-2">Plan Gratuito</CardTitle>
                  <div className="text-5xl font-bold mb-4">€0<span className="text-xl text-muted-foreground font-normal">/mes</span></div>
                  <p className="text-muted-foreground">
                    {t('freemium.free_credits')}
                  </p>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-4 mb-8">
                    {[
                      "50 consultas mensuales",
                      "Acceso a MedGemma",
                      "Historial básico",
                      "Soporte por email"
                    ].map((feature, index) => (
                      <li key={index} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-success" />
                        </div>
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
            
            {/* Paid Plan */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card className="relative h-full border-primary/50 bg-gradient-to-b from-primary/5 to-transparent" style={{ boxShadow: 'var(--shadow-elevated)' }}>
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground shadow-md">
                    Más popular
                  </Badge>
                </div>
                
                <CardHeader className="text-center pb-8 pt-10">
                  <CardTitle className="text-2xl font-bold mb-2">Plan Pro</CardTitle>
                  <div className="text-5xl font-bold mb-4">€19.99<span className="text-xl text-muted-foreground font-normal">/mes</span></div>
                  <p className="text-muted-foreground">
                    Consultas ilimitadas + funciones avanzadas
                  </p>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-4 mb-8">
                    {[
                      "Consultas ilimitadas",
                      "Acceso a todos los LLMs",
                      "Historial completo",
                      "Soporte prioritario",
                      "Funciones avanzadas",
                      "API access"
                    ].map((feature, index) => (
                      <li key={index} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-success" />
                        </div>
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="hero"
                        className="w-full" 
                        disabled
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        {t('freemium.upgrade')}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {t('freemium.coming_soon')}
                    </TooltipContent>
                  </Tooltip>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${className}`}>
      {children}
    </div>
  )
}