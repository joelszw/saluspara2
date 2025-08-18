import React, { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

// Medical terms dictionary for traumatology and orthopedics
const MEDICAL_TERMS: Record<string, { definition: string; reference: string }> = {
  "hallux valgus": {
    definition: "Deformidad del primer dedo del pie donde el hallux se desvía hacia los dedos menores, formando un ángulo anormal en la articulación metatarsofalángica.",
    reference: "Nix et al. Prevalence of hallux valgus in the general population: a systematic review. J Foot Ankle Res. 2010."
  },
  "osteotomía": {
    definition: "Procedimiento quirúrgico que consiste en cortar un hueso para corregir deformidades, realinear estructuras o cambiar la distribución de cargas.",
    reference: "Barouk LS. Scarf osteotomy for hallux valgus correction. Foot Ankle Clin. 2000."
  },
  "artrodesis": {
    definition: "Fusión quirúrgica de una articulación, eliminando el movimiento articular para lograr estabilidad y aliviar el dolor.",
    reference: "Coughlin MJ, Mann RA. Surgery of the Foot and Ankle. 8th ed. Mosby; 2007."
  },
  "metatarsalgia": {
    definition: "Dolor en la región plantar del antepié, específicamente en la zona de los huesos metatarsianos, frecuentemente asociado con sobrecarga mecánica.",
    reference: "Espinosa et al. Current concept review: metatarsalgia. Foot Ankle Int. 2008."
  },
  "fascitis plantar": {
    definition: "Inflamación de la fascia plantar, banda de tejido que conecta el calcáneo con los dedos, causando dolor en el talón y planta del pie.",
    reference: "Buchbinder R. Clinical practice. Plantar fasciitis. N Engl J Med. 2004."
  },
  "síndrome del túnel carpiano": {
    definition: "Neuropatía compresiva del nervio mediano a su paso por el túnel carpiano en la muñeca, causando entumecimiento y dolor en la mano.",
    reference: "Atroshi et al. Prevalence of carpal tunnel syndrome in a general population. JAMA. 1999."
  },
  "luxación": {
    definition: "Pérdida completa del contacto entre las superficies articulares de una articulación, requiriendo reducción para restaurar la anatomía normal.",
    reference: "Court-Brown CM, Heckman JD, McQueen MM, et al. Rockwood and Green's Fractures in Adults. 8th ed."
  },
  "fractura": {
    definition: "Interrupción en la continuidad del hueso causada por trauma, fatiga o condiciones patológicas, clasificada según localización, patrón y desplazamiento.",
    reference: "AO Foundation. AO Principles of Fracture Management. 2nd ed."
  },
  "artrosis": {
    definition: "Enfermedad degenerativa articular caracterizada por pérdida del cartílago articular, formación de osteofitos y cambios subcondrales.",
    reference: "Hunter DJ, Bierma-Zeinstra S. Osteoarthritis. Lancet. 2019."
  },
  "tendinopatía": {
    definition: "Término general para describir condiciones dolorosas que afectan los tendones, incluyendo tendinitis, tendinosis y rupturas parciales.",
    reference: "Cook JL, Purdam CR. Is tendon pathology a continuum? A pathology model to explain the clinical presentation of load-induced tendinopathy. Br J Sports Med. 2009."
  },
  "menisco": {
    definition: "Estructuras fibrocartilaginosas en forma de C ubicadas en la rodilla entre el fémur y la tibia, que actúan como amortiguadores y estabilizadores.",
    reference: "Fox AJ, Bedi A, Rodeo SA. The basic science of the patella: structure, composition, and function. J Knee Surg. 2012."
  },
  "ligamento cruzado anterior": {
    definition: "Ligamento intrarticular de la rodilla que previene el desplazamiento anterior de la tibia respecto al fémur y proporciona estabilidad rotacional.",
    reference: "Boden BP, Dean GS, Feagin JA Jr, Garrett WE Jr. Mechanisms of anterior cruciate ligament injury. Orthopedics. 2000."
  },
  "lca": {
    definition: "Siglas de Ligamento Cruzado Anterior. Ligamento intrarticular de la rodilla que previene el desplazamiento anterior de la tibia respecto al fémur.",
    reference: "Boden BP, Dean GS, Feagin JA Jr, Garrett WE Jr. Mechanisms of anterior cruciate ligament injury. Orthopedics. 2000."
  },
  "rmn": {
    definition: "Resonancia Magnética Nuclear. Técnica de imagen médica que utiliza campos magnéticos para visualizar estructuras internas sin radiación ionizante.",
    reference: "Helms CA, Major NM, Anderson MW, et al. Musculoskeletal MRI. 3rd ed. Elsevier; 2020."
  },
  "tac": {
    definition: "Tomografía Axial Computarizada. Técnica de imagen que utiliza rayos X para crear imágenes transversales detalladas del cuerpo.",
    reference: "Novelline RA. Squire's Fundamentals of Radiology. 6th ed. Harvard University Press; 2004."
  }
}

interface MedicalTermsTooltipProps {
  text: string
}

export function MedicalTermsTooltip({ text }: MedicalTermsTooltipProps) {
  const [hoveredTerm, setHoveredTerm] = useState<string | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const tooltipRef = useRef<HTMLDivElement>(null)

  const handleTermHover = (term: string, event: React.MouseEvent) => {
    setHoveredTerm(term)
    const rect = event.currentTarget.getBoundingClientRect()
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    })
  }

  const handleTermLeave = () => {
    setHoveredTerm(null)
  }

  // Function to highlight medical terms in text
  const highlightMedicalTerms = (inputText: string) => {
    let highlightedText = inputText
    const termEntries = Object.entries(MEDICAL_TERMS)
    
    // Sort by length (longest first) to avoid partial matches
    termEntries.sort(([a], [b]) => b.length - a.length)
    
    termEntries.forEach(([term, data]) => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi')
      highlightedText = highlightedText.replace(regex, (match) => {
        return `<span 
          class="medical-term cursor-help underline decoration-dotted decoration-primary/60 hover:decoration-solid hover:bg-primary/10 rounded px-1 transition-all duration-200" 
          data-term="${term}"
        >${match}</span>`
      })
    })
    
    return highlightedText
  }

  // Add event listeners for dynamically created spans
  useEffect(() => {
    const spans = document.querySelectorAll('.medical-term')
    
    const handleMouseEnter = (e: Event) => {
      const target = e.target as HTMLElement
      const term = target.getAttribute('data-term')
      if (term) {
        const rect = target.getBoundingClientRect()
        setTooltipPosition({
          x: rect.left + rect.width / 2,
          y: rect.top - 10
        })
        setHoveredTerm(term)
      }
    }
    
    const handleMouseLeave = () => {
      setHoveredTerm(null)
    }
    
    spans.forEach(span => {
      span.addEventListener('mouseenter', handleMouseEnter)
      span.addEventListener('mouseleave', handleMouseLeave)
    })
    
    return () => {
      spans.forEach(span => {
        span.removeEventListener('mouseenter', handleMouseEnter)
        span.removeEventListener('mouseleave', handleMouseLeave)
      })
    }
  }, [text])

  return (
    <div className="relative">
      <div 
        dangerouslySetInnerHTML={{ 
          __html: highlightMedicalTerms(text) 
        }} 
      />
      
      <AnimatePresence>
        {hoveredTerm && MEDICAL_TERMS[hoveredTerm] && (
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ duration: 0.15 }}
            className="fixed z-50 max-w-sm p-4 bg-card border border-border rounded-lg shadow-lg"
            style={{
              left: `${tooltipPosition.x}px`,
              top: `${tooltipPosition.y}px`,
              transform: 'translateX(-50%) translateY(-100%)'
            }}
          >
            <div className="space-y-2">
              <h4 className="font-semibold text-primary capitalize">
                {hoveredTerm}
              </h4>
              <p className="text-sm text-foreground leading-relaxed">
                {MEDICAL_TERMS[hoveredTerm].definition}
              </p>
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground italic">
                  <strong>Referencia:</strong> {MEDICAL_TERMS[hoveredTerm].reference}
                </p>
              </div>
            </div>
            
            {/* Arrow pointing down */}
            <div 
              className="absolute top-full left-1/2 transform -translate-x-1/2"
              style={{ marginTop: '-1px' }}
            >
              <div className="w-2 h-2 bg-card border-r border-b border-border transform rotate-45"></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}