import { motion } from "framer-motion"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Check, CreditCard } from "lucide-react"

export function Freemium() {
  const { t } = useTranslation()

  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            {t('freemium.title')}
          </h2>
        </motion.div>
        
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Free Plan */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card className="relative h-full">
                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl mb-2">Plan Gratuito</CardTitle>
                  <div className="text-4xl font-bold text-primary mb-4">€0/mes</div>
                  <p className="text-muted-foreground">
                    {t('freemium.free_credits')}
                  </p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-8">
                    {[
                      "50 consultas mensuales",
                      "Acceso a MedGemma",
                      "Historial básico",
                      "Soporte por email"
                    ].map((feature, index) => (
                      <li key={index} className="flex items-center gap-3">
                        <Check className="w-5 h-5 text-success" />
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
              <Card className="relative h-full border-primary/50 bg-gradient-to-b from-primary/5 to-transparent">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-primary to-success text-white border-0">
                    Más popular
                  </Badge>
                </div>
                
                <CardHeader className="text-center pb-8 pt-8">
                  <CardTitle className="text-2xl mb-2">Plan Pro</CardTitle>
                  <div className="text-4xl font-bold text-primary mb-4">€19.99/mes</div>
                  <p className="text-muted-foreground">
                    Consultas ilimitadas + funciones avanzadas
                  </p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-8">
                    {[
                      "Consultas ilimitadas",
                      "Acceso a todos los LLMs",
                      "Historial completo",
                      "Soporte prioritario",
                      "Funciones avanzadas",
                      "API access"
                    ].map((feature, index) => (
                      <li key={index} className="flex items-center gap-3">
                        <Check className="w-5 h-5 text-success" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        className="w-full bg-gradient-to-r from-primary to-success hover:from-primary/90 hover:to-success/90 text-white border-0" 
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