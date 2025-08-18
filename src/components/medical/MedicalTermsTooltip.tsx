import React, { useState, useRef, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"

// Extended medical terms dictionary for traumatology and orthopedics
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
  "artroplastia": {
    definition: "Procedimiento quirúrgico de reemplazo articular donde se sustituye una articulación dañada por una prótesis artificial.",
    reference: "Learmonth ID, Young C, Rorabeck C. The operation of the century: total hip replacement. Lancet. 2007."
  },
  "condromalacia": {
    definition: "Degeneración del cartílago articular, comúnmente afecta la rótula causando dolor y crepitación.",
    reference: "Bentley G, Dowd G. Current concepts of etiology and treatment of chondromalacia patellae. Clin Orthop Relat Res. 1984."
  },
  "sinovitis": {
    definition: "Inflamación de la membrana sinovial que recubre las articulaciones, causando dolor, hinchazón y limitación del movimiento.",
    reference: "Goldenberg DL. Septic arthritis. Lancet. 1998."
  },
  "bursitis": {
    definition: "Inflamación de las bursas, pequeñas bolsas llenas de líquido que actúan como amortiguadores entre huesos, tendones y músculos.",
    reference: "Zimmermann B 3rd, Mikolich DJ, Ho G Jr. Septic bursitis. Semin Arthritis Rheum. 1995."
  },
  "epicondilitis": {
    definition: "Inflamación de los tendones que se insertan en los epicóndilos del húmero, conocida como 'codo de tenista' (lateral) o 'codo de golfista' (medial).",
    reference: "Shiri R, Viikari-Juntura E, Varonen H, Heliövaara M. Prevalence and determinants of lateral and medial epicondylitis. Am J Epidemiol. 2006."
  },
  "tenosinovitis": {
    definition: "Inflamación de la vaina sinovial que rodea los tendones, causando dolor y limitación del movimiento.",
    reference: "Huisstede BM, Coert JH, Fridén J, Hoogvliet P. Consensus on a multidisciplinary treatment guideline for de Quervain disease. Plast Reconstr Surg. 2014."
  },
  "escoliosis": {
    definition: "Curvatura lateral anormal de la columna vertebral mayor a 10 grados, puede ser idiopática, congénita o neuromuscular.",
    reference: "Weinstein SL, Dolan LA, Cheng JC, et al. Adolescent idiopathic scoliosis. Lancet. 2008."
  },
  "cifosis": {
    definition: "Curvatura excesiva hacia adelante de la columna vertebral torácica, creando una apariencia de joroba.",
    reference: "Scheuermann HW. Kyphosis dorsalis juvenilis. Ugeskr Laeger. 1920."
  },
  "lordosis": {
    definition: "Curvatura excesiva hacia adentro de la columna vertebral lumbar o cervical.",
    reference: "Been E, Kalichman L. Lumbar lordosis. Spine J. 2014."
  },
  "espondilolistesis": {
    definition: "Deslizamiento hacia adelante de una vértebra sobre la vértebra inferior, comúnmente en L5 sobre S1.",
    reference: "Wiltse LL, Newman PH, Macnab I. Classification of spondylolisis and spondylolisthesis. Clin Orthop Relat Res. 1976."
  },
  "espondilosis": {
    definition: "Degeneración de los discos intervertebrales y cambios osteoartríticos en las vértebras.",
    reference: "Kirkaldy-Willis WH, Farfan HF. Instability of the lumbar spine. Clin Orthop Relat Res. 1982."
  },
  "hernia discal": {
    definition: "Protrusión del núcleo pulposo del disco intervertebral a través de fisuras en el anillo fibroso.",
    reference: "Mixter WJ, Barr JS. Rupture of the intervertebral disc with involvement of the spinal canal. N Engl J Med. 1934."
  },
  "radiculopatía": {
    definition: "Disfunción de una raíz nerviosa espinal que causa dolor, debilidad, entumecimiento en la distribución del nervio afectado.",
    reference: "Tarulli AW, Raynor EM. Lumbosacral radiculopathy. Neurol Clin. 2007."
  },
  "mielopatía": {
    definition: "Disfunción de la médula espinal causada por compresión, inflamación o lesión vascular.",
    reference: "Young WF. Cervical spondylotic myelopathy: a common cause of spinal cord dysfunction in older persons. Am Fam Physician. 2000."
  },
  "claudicación neurógena": {
    definition: "Dolor y debilidad en las piernas al caminar, causado por estenosis del canal espinal.",
    reference: "Katz JN, Harris MB. Clinical practice. Lumbar spinal stenosis. N Engl J Med. 2008."
  }
}

// Medical patterns for automatic detection
const MEDICAL_PATTERNS = {
  // Medical suffixes
  suffixes: [
    'itis', 'osis', 'oma', 'emia', 'uria', 'algia', 'patía', 'plasty', 'ectomy', 
    'otomy', 'scopy', 'graphy', 'metry', 'therapy', 'lysis', 'genesis', 'trophy'
  ],
  // Medical prefixes
  prefixes: [
    'artro', 'osteo', 'condro', 'mio', 'neuro', 'cardio', 'gastro', 'hepato',
    'nefro', 'pneumo', 'hemo', 'leuco', 'eritro', 'meta', 'hiper', 'hipo'
  ],
  // Common medical acronyms
  acronyms: [
    'LCA', 'LCP', 'LCM', 'LCL', 'ATM', 'ITB', 'RICE', 'AINE', 'AAS', 'PCR',
    'VSG', 'EMG', 'ENG', 'RM', 'TAC', 'RX', 'ECG', 'EEG', 'PET', 'SPECT'
  ]
}

// Function to detect if a word is likely a medical term
const isMedicalTerm = (word: string): boolean => {
  const cleanWord = word.toLowerCase().trim()
  
  // Check if already in dictionary
  if (MEDICAL_TERMS[cleanWord]) return true
  
  // Check medical suffixes
  const hasMedicalSuffix = MEDICAL_PATTERNS.suffixes.some(suffix => 
    cleanWord.endsWith(suffix) && cleanWord.length > suffix.length + 2
  )
  
  // Check medical prefixes
  const hasMedicalPrefix = MEDICAL_PATTERNS.prefixes.some(prefix => 
    cleanWord.startsWith(prefix) && cleanWord.length > prefix.length + 2
  )
  
  // Check if it's a medical acronym (2-5 uppercase letters)
  const isAcronym = /^[A-Z]{2,5}$/.test(word) && MEDICAL_PATTERNS.acronyms.includes(word)
  
  // Check if it contains medical word patterns
  const hasAnatomicalTerms = /^(cervical|torácic|lumbar|sacr|coccíge|femor|tibi|húmer|radi|cubit|metacarp|metatars|falang)/i.test(cleanWord)
  
  return hasMedicalSuffix || hasMedicalPrefix || isAcronym || hasAnatomicalTerms
}

// Generate basic definition for unknown medical terms
const generateBasicDefinition = (term: string): { definition: string; reference: string } => {
  const cleanTerm = term.toLowerCase()
  
  // Pattern-based definitions
  if (cleanTerm.endsWith('itis')) {
    return {
      definition: `Inflamación de ${cleanTerm.replace('itis', '')}. Condición caracterizada por dolor, hinchazón y posible pérdida de función.`,
      reference: "Definición basada en patrones médicos estándar."
    }
  }
  
  if (cleanTerm.endsWith('osis')) {
    return {
      definition: `Condición o proceso degenerativo relacionado con ${cleanTerm.replace('osis', '')}. Estado patológico crónico.`,
      reference: "Definición basada en patrones médicos estándar."
    }
  }
  
  if (cleanTerm.endsWith('oma')) {
    return {
      definition: `Tumor o masa relacionada con ${cleanTerm.replace('oma', '')}. Crecimiento anormal de tejido.`,
      reference: "Definición basada en patrones médicos estándar."
    }
  }
  
  if (cleanTerm.endsWith('algia')) {
    return {
      definition: `Dolor en ${cleanTerm.replace('algia', '')}. Síntoma caracterizado por molestia o dolor localizado.`,
      reference: "Definición basada en patrones médicos estándar."
    }
  }
  
  if (cleanTerm.startsWith('artro')) {
    return {
      definition: `Término relacionado con articulaciones. ${term} se refiere a una condición, procedimiento o estructura articular.`,
      reference: "Definición basada en terminología médica estándar."
    }
  }
  
  if (cleanTerm.startsWith('osteo')) {
    return {
      definition: `Término relacionado con huesos. ${term} se refiere a una condición, procedimiento o estructura ósea.`,
      reference: "Definición basada en terminología médica estándar."
    }
  }
  
  // Default for unrecognized terms
  return {
    definition: `Término médico especializado: ${term}. Se recomienda consultar literatura médica específica para definición detallada.`,
    reference: "Consulte fuentes médicas especializadas para información detallada."
  }
}

interface MedicalTermsTooltipProps {
  text: string
}

export function MedicalTermsTooltip({ text }: MedicalTermsTooltipProps) {
  const [hoveredTerm, setHoveredTerm] = useState<string | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [usedReferences, setUsedReferences] = useState<Set<string>>(new Set())
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

  // Function to highlight medical terms in text and collect references
  const processText = (inputText: string) => {
    let highlightedText = inputText
    const processedTerms = new Set<string>()
    const references = new Set<string>()
    
    // Extract words from text for analysis
    const words = inputText.match(/\b[A-Za-záéíóúüñÁÉÍÓÚÜÑ]+\b/g) || []
    const uniqueWords = [...new Set(words)]
    
    // Find all medical terms (both dictionary and pattern-based)
    const medicalTermsFound: string[] = []
    
    // Check dictionary terms first (exact matches)
    Object.keys(MEDICAL_TERMS).forEach(term => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi')
      if (regex.test(inputText)) {
        medicalTermsFound.push(term)
      }
    })
    
    // Check for pattern-based medical terms
    uniqueWords.forEach(word => {
      if (isMedicalTerm(word) && !MEDICAL_TERMS[word.toLowerCase()]) {
        medicalTermsFound.push(word)
      }
    })
    
    // Sort by length (longest first) to avoid partial matches
    medicalTermsFound.sort((a, b) => b.length - a.length)
    
    // Apply highlighting (only first occurrence)
    medicalTermsFound.forEach(term => {
      const termLower = term.toLowerCase()
      if (processedTerms.has(termLower)) return
      
      // Get term info and add reference
      const termInfo = MEDICAL_TERMS[termLower] || generateBasicDefinition(term)
      references.add(termInfo.reference)
      
      const regex = new RegExp(`\\b${term}\\b`, 'i') // Only match first occurrence
      highlightedText = highlightedText.replace(regex, (match) => {
        processedTerms.add(termLower)
        return `<span 
          class="medical-term cursor-help underline decoration-dotted decoration-primary/60 hover:decoration-solid hover:bg-primary/10 rounded px-1 transition-all duration-200" 
          data-term="${match.toLowerCase()}"
        >${match}</span>`
      })
    })
    
    return { highlightedText, references }
  }

  // Process text and memoize the result
  const processedContent = useMemo(() => processText(text), [text])

  // Update references when content changes
  useEffect(() => {
    setUsedReferences(processedContent.references)
  }, [processedContent.references])

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
          __html: processedContent.highlightedText 
        }} 
      />
      
      {/* References section */}
      {usedReferences.size > 0 && (
        <div className="mt-6 pt-4 border-t border-border">
          <h4 className="text-sm font-semibold text-foreground mb-3">📚 Referencias utilizadas:</h4>
          <ul className="space-y-1">
            {Array.from(usedReferences).map((reference, index) => (
              <li key={index} className="text-xs text-muted-foreground">
                <span className="font-medium">[{index + 1}]</span> {reference}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <AnimatePresence>
        {hoveredTerm && (
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
            {(() => {
              const termInfo = MEDICAL_TERMS[hoveredTerm] || generateBasicDefinition(hoveredTerm)
              return (
                <div className="space-y-2">
                  <h4 className="font-semibold text-primary capitalize">
                    {hoveredTerm}
                  </h4>
                  <p className="text-sm text-foreground leading-relaxed">
                    {termInfo.definition}
                  </p>
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground italic">
                      <strong>Referencia:</strong> {termInfo.reference}
                    </p>
                  </div>
                </div>
              )
            })()}
            
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