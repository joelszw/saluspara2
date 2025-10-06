import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { HfInference } from 'https://esm.sh/@huggingface/inference@2.3.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Retry function for rate-limited requests
async function fetchWithRetry(url: string, maxRetries = 3, delay = 1000): Promise<Response> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url)
      
      if (response.status === 429) {
        console.warn(`Rate limited (429) on attempt ${attempt}/${maxRetries}. Retrying in ${delay}ms...`)
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay))
          delay *= 2 // Exponential backoff
          continue
        }
      }
      
      return response
    } catch (error) {
      console.warn(`Fetch failed on attempt ${attempt}/${maxRetries}:`, error)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay))
        delay *= 2
        continue
      }
      throw error
    }
  }
  
  throw new Error(`Failed after ${maxRetries} attempts`)
}

interface PubMedArticle {
  id: string
  title: string
  authors: string
  abstract: string
  doi: string
  url: string
  year: string
  journal: string
  pmid: string
}

interface PubMedSearchResult {
  articles: PubMedArticle[]
  keywords: string[]
  translatedQuery: string
  searchType: 'AND' | 'OR'
  selectedKeyword?: string
}

async function translateToEnglish(spanishText: string, hf: HfInference): Promise<string> {
  try {
    const result = await hf.translation({
      model: 'Helsinki-NLP/opus-mt-es-en',
      inputs: spanishText,
    })
    return result.translation_text || spanishText
  } catch (error) {
    console.warn('Translation failed, using original text:', error)
    return spanishText
  }
}

async function extractKeywords(text: string, hf: HfInference): Promise<string[]> {
  console.log('Starting keyword extraction for:', text);
  
  // First try AI-based extraction with a more stable model
  try {
    console.log('Attempting AI keyword extraction...');
    const result = await hf.textClassification({
      model: 'microsoft/DialoGPT-medium',
      inputs: text,
    });
    
    console.log('AI extraction result:', result);
    
    if (result && Array.isArray(result) && result.length > 0) {
      const aiKeywords = result
        .map(item => item.label)
        .filter(label => label && label.length > 2)
        .slice(0, 3);
      
      if (aiKeywords.length > 0) {
        console.log('AI keywords found:', aiKeywords);
        return [...aiKeywords, ...getAdvancedMedicalKeywords(text)].slice(0, 5);
      }
    }
  } catch (error) {
    console.warn('AI keyword extraction failed:', error);
  }
  
  // Fallback to advanced rule-based extraction
  console.log('Using advanced rule-based keyword extraction...');
  return getAdvancedMedicalKeywords(text);
}

function getAdvancedMedicalKeywords(text: string): string[] {
  console.log('Extracting advanced medical keywords from:', text);
  
  const lowerText = text.toLowerCase();
  const originalText = text;
  
  // Comprehensive medical terminology dictionary
  const medicalTerms = {
    // Anatomical regions (VERY SPECIFIC - highest priority)
    anatomy: ['ankle', 'tobillo', 'knee', 'rodilla', 'hip', 'cadera', 'shoulder', 'hombro', 'elbow', 'codo', 
              'wrist', 'muñeca', 'spine', 'columna', 'foot', 'pie', 'hand', 'mano', 'femur', 'tibia', 'fibula'],
    // Orthopedic specific terms
    orthopedic: ['hallux', 'valgus', 'abductus', 'bunion', 'metatarsal', 'phalanx', 'osteotomy', 'arthrodesis', 'arthroplasty'],
    // Surgical approaches
    surgical: ['mis', 'minimally invasive', 'percutaneous', 'open', 'arthroscopic', 'endoscopic', 'laparoscopic'],
    // General medical terms
    generalAnatomy: ['bone', 'joint', 'ligament', 'tendon', 'cartilage', 'muscle', 'nerve', 'artery', 'vein'],
    pathology: ['fracture', 'fractura', 'rupture', 'tear', 'sprain', 'strain', 'inflammation', 'infection', 'deformity'],
    treatment: ['surgery', 'cirugía', 'rehabilitation', 'rehabilitación', 'therapy', 'terapia', 'treatment', 'tratamiento', 'management', 'protocol', 'technique'],
    // Common non-medical words to EXCLUDE
    stopWords: ['could', 'would', 'should', 'tell', 'me', 'the', 'you', 'please', 'what', 'how', 'when', 'where', 
                'podrías', 'indicarme', 'más', 'sobre', 'en', 'de', 'la', 'el', 'los', 'las', 'un', 'una', 'articles', 'artículos', 'latest', 'recientes']
  };
  
  const extractedKeywords = new Set<string>();
  
  // First, extract multi-word anatomical phrases (e.g., "ankle fracture")
  const anatomyWithPathology: string[] = [];
  medicalTerms.anatomy.forEach(anat => {
    medicalTerms.pathology.forEach(path => {
      const phrase = `${anat} ${path}`;
      if (lowerText.includes(phrase.toLowerCase())) {
        anatomyWithPathology.push(phrase);
        console.log(`FOUND MULTI-WORD: "${phrase}"`);
      }
    });
  });
  
  // Add multi-word phrases as high priority
  anatomyWithPathology.forEach(phrase => extractedKeywords.add(phrase));
  
  // Extract medical terms from all categories (EXCEPT stopWords)
  Object.entries(medicalTerms).forEach(([category, terms]) => {
    if (category === 'stopWords') return; // Skip stop words
    
    terms.forEach(term => {
      if (lowerText.includes(term.toLowerCase())) {
        extractedKeywords.add(term);
      }
    });
  });
  
  // Filter out stop words from extracted keywords
  const filteredKeywords = Array.from(extractedKeywords).filter(keyword => {
    const lowerKw = keyword.toLowerCase();
    return !medicalTerms.stopWords.some(stopWord => lowerKw === stopWord);
  });
  
  // Prioritize specific anatomy + pathology combinations
  const combinedTerms = filteredKeywords.filter(kw => kw.includes(' '));
  
  // Prioritize specific anatomical regions
  const anatomicalTerms = filteredKeywords.filter(kw => 
    medicalTerms.anatomy.some(term => kw.toLowerCase() === term.toLowerCase())
  );
  
  // Prioritize orthopedic terms if found
  const orthopedicTerms = filteredKeywords.filter(kw => 
    medicalTerms.orthopedic.some(term => kw.toLowerCase().includes(term.toLowerCase()))
  );
  
  // Prioritize surgical terms
  const surgicalTerms = filteredKeywords.filter(kw => 
    medicalTerms.surgical.some(term => kw.toLowerCase().includes(term.toLowerCase()))
  );
  
  // Get treatment terms
  const treatmentTerms = filteredKeywords.filter(kw => 
    medicalTerms.treatment.some(term => kw.toLowerCase() === term.toLowerCase())
  );
  
  // Get pathology terms
  const pathologyTerms = filteredKeywords.filter(kw => 
    medicalTerms.pathology.some(term => kw.toLowerCase() === term.toLowerCase())
  );
  
  // Build final keyword list with NEW prioritization: anatomy + pathology combos > anatomy > pathology > treatment
  const finalKeywords = [
    ...combinedTerms,                    // 1. Combined terms like "ankle fracture" (HIGHEST)
    ...anatomicalTerms,                  // 2. Specific anatomy like "ankle" (VERY HIGH)
    ...orthopedicTerms,                  // 3. Orthopedic terms
    ...surgicalTerms,                    // 4. Surgical terms
    ...pathologyTerms,                   // 5. Pathology (lower than anatomy now)
    ...treatmentTerms,                   // 6. Treatment (lowest)
    ...filteredKeywords.filter(kw => 
      !combinedTerms.includes(kw) && 
      !anatomicalTerms.includes(kw) && 
      !orthopedicTerms.includes(kw) && 
      !surgicalTerms.includes(kw) &&
      !pathologyTerms.includes(kw) &&
      !treatmentTerms.includes(kw)
    )
  ].slice(0, 5); // Limit to 5 keywords
  
  console.log('Advanced extraction results:', {
    foundTerms: filteredKeywords,
    combinedTerms,
    anatomicalTerms,
    orthopedicTerms,
    surgicalTerms,
    pathologyTerms,
    treatmentTerms,
    finalKeywords
  });
  
  // Fallback to basic terms if nothing found
  if (finalKeywords.length === 0) {
    console.log('No specific terms found, using fallback keywords');
    return getBasicMedicalKeywords(text);
  }
  
  return finalKeywords;
}

// Helper function to normalize Spanish medical terms to English for PubMed
function normalizeForPubMed(keyword: string): string {
  const spanishToEnglishMap: { [key: string]: string } = {
    'exóstosis': 'exostosis',
    'exostósis': 'exostosis',
    'exostosis': 'exostosis',
    'tratamiento': 'treatment',
    'cirugía': 'surgery',
    'cirugia': 'surgery'
  };
  
  const normalized = keyword.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return spanishToEnglishMap[normalized] || keyword;
}

function selectMostSpecificKeyword(keywords: string[]): string {
  console.log('Selecting most specific keyword from:', keywords);
  
  const scoredKeywords = keywords.map(keyword => {
    let score = 0;
    const lowerKeyword = keyword.toLowerCase();
    
    // BONUS for multi-word combinations (e.g., "ankle fracture")
    if (keyword.includes(' ')) {
      score += 25; // HIGHEST priority for combined terms
      console.log(`DEBUG: "${keyword}" is MULTI-WORD COMBINATION (+25 points)`);
    }
    
    // ENHANCED pathology detection with proper Spanish-English normalization
    let normalizedKeyword = lowerKeyword
      .normalize('NFD') // Decompose accents
      .replace(/[\u0300-\u036f]/g, '') // Remove accent marks
      .replace(/[^a-z ]/g, ''); // Keep only letters and spaces
    
    // Special mapping for Spanish medical terms to correct English equivalents
    const spanishToEnglishMap: { [key: string]: string } = {
      'exostosis': 'exostosis',
      'exostósis': 'exostosis', 
      'exóstosis': 'exostosis',
      'tobillo': 'ankle',
      'rodilla': 'knee',
      'cadera': 'hip',
      'hombro': 'shoulder',
      'codo': 'elbow',
      'muñeca': 'wrist',
      'columna': 'spine',
      'pie': 'foot',
      'mano': 'hand',
      'fractura': 'fracture',
      'rehabilitación': 'rehabilitation',
      'cirugía': 'surgery',
      'tratamiento': 'treatment'
    };
    
    // Apply mapping if the original keyword matches
    const originalNormalized = keyword.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z ]/g, '');
    if (spanishToEnglishMap[originalNormalized]) {
      normalizedKeyword = spanishToEnglishMap[originalNormalized];
      console.log(`DEBUG: Mapped "${keyword}" -> "${normalizedKeyword}" (Spanish to English)`);
    }
    
    console.log(`DEBUG: Analyzing keyword "${keyword}" -> normalized: "${normalizedKeyword}"`);
    
    // Specific anatomical regions (NEW - VERY HIGH PRIORITY)
    const specificAnatomy = ['ankle', 'tobillo', 'knee', 'rodilla', 'hip', 'cadera', 'shoulder', 'hombro', 
                             'elbow', 'codo', 'wrist', 'muñeca', 'spine', 'columna', 'foot', 'pie', 'hand', 'mano'];
    const isSpecificAnatomy = specificAnatomy.some(anat => {
      const normalizedAnat = anat.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const match = normalizedKeyword.includes(normalizedAnat) || lowerKeyword.includes(anat);
      if (match) {
        console.log(`DEBUG: Found specific anatomy match: "${keyword}" contains "${anat}"`);
      }
      return match;
    });
    
    if (isSpecificAnatomy) {
      score += 20; // VERY HIGH PRIORITY for specific anatomy
      console.log(`DEBUG: "${keyword}" identified as SPECIFIC ANATOMY (+20 points)`);
    }
    
    // BILINGUAL pathologies list - Spanish and English variations
    const pathologies = [
      'exostosis', 'exostósis', 'exóstosis', 'exostoses',
      'neuroma', 'bursitis', 'hallux', 'metatarsalgia', 'fasciitis',
      'morton', 'capsulitis', 'tendinitis', 'tendinosis', 'tendinopatía',
      'bunion', 'juanete', 'hammertoe', 'clawtoe', 'mallettoe',
      'plantar', 'fascitis', 'neuromatosis', 'sesamoiditis',
      'osteomielitis', 'osteomyelitis', 'artritis', 'arthritis',
      'sinovitis', 'synovitis', 'condromalacia', 'chondromalacia',
      'tumor', 'quiste', 'cyst', 'lesion', 'lesión', 'fractura', 'fracture',
      'deformidad', 'deformity', 'espolón', 'spur', 'calcáneo', 'calcaneal'
    ];
    
    const isPathology = pathologies.some(path => {
      const normalizedPath = path.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
      const match = normalizedKeyword.replace(/[^a-z]/g, '').includes(normalizedPath) || lowerKeyword.includes(path);
      if (match) {
        console.log(`DEBUG: Found pathology match: "${keyword}" contains "${path}"`);
      }
      return match;
    });
    
    if (isPathology && !isSpecificAnatomy) { // Only add if not already specific anatomy
      score += 12; // REDUCED from 15 (anatomy now has priority)
      console.log(`DEBUG: "${keyword}" identified as PATHOLOGY (+12 points)`);
    }
    
    // General anatomy (lower priority than specific)
    const generalAnatomy = ['interdigital', 'plantar', 'dorsal', 'medial', 'lateral', 'proximal', 'distal', 'bone', 'joint'];
    const isGeneralAnatomy = generalAnatomy.some(anat => lowerKeyword.includes(anat));
    if (isGeneralAnatomy && !isSpecificAnatomy) {
      score += 8;
      console.log(`DEBUG: "${keyword}" identified as GENERAL ANATOMY (+8 points)`);
    }
    
    // Specific procedures
    const procedures = ['osteotomy', 'arthrodesis', 'arthroplasty', 'resection', 'excision', 'reconstruction'];
    const isProcedure = procedures.some(proc => lowerKeyword.includes(proc));
    if (isProcedure) {
      score += 10;
      console.log(`DEBUG: "${keyword}" identified as PROCEDURE (+10 points)`);
    }
    
    // Treatment terms (specific ones)
    const treatments = ['rehabilitation', 'rehabilitación', 'therapy', 'terapia'];
    const isTreatment = treatments.some(treat => lowerKeyword.includes(treat));
    if (isTreatment && !keyword.includes(' ')) { // Don't double count if in multi-word
      score += 7;
      console.log(`DEBUG: "${keyword}" identified as TREATMENT (+7 points)`);
    }
    
    // Technical terms
    const technical = ['minimally', 'invasive', 'percutaneous', 'arthroscopic', 'endoscopic'];
    if (technical.some(tech => lowerKeyword.includes(tech))) {
      score += 6;
    }
    
    // PENALIZE very generic terms
    const veryGeneric = ['tratamiento', 'treatment', 'cirugía', 'surgery', 'manejo', 'management'];
    if (veryGeneric.some(gen => lowerKeyword === gen)) {
      score -= 8; // More penalty
      console.log(`DEBUG: "${keyword}" is VERY GENERIC (-8 points)`);
    }
    
    // Bonus for longer, more specific terms
    if (keyword.length > 12) {
      score += 4;
    } else if (keyword.length > 8) {
      score += 2;
    }
    
    // Enhanced bonus for Latin/medical endings
    if (lowerKeyword.endsWith('osis') || lowerKeyword.endsWith('ósis')) {
      score += 5;
    } else {
      const medicalEndings = ['itis', 'oma', 'ia', 'us', 'um'];
      if (medicalEndings.some(ending => lowerKeyword.endsWith(ending))) {
        score += 3;
      }
    }
    
    console.log(`FINAL SCORE: "${keyword}" = ${score} points (anatomy: ${isSpecificAnatomy}, pathology: ${isPathology}, procedure: ${isProcedure}, treatment: ${isTreatment})`);
    return { keyword, score };
  });
  
  // Sort by score (highest first) and return the best keyword
  const sortedKeywords = scoredKeywords.sort((a, b) => b.score - a.score);
  const selectedKeyword = sortedKeywords[0]?.keyword || keywords[0];
  
  console.log('=== KEYWORD SELECTION RESULTS ===');
  console.log('All scored keywords:', sortedKeywords.map(k => `${k.keyword}: ${k.score}`));
  console.log('Selected keyword for OR search:', selectedKeyword, 'with final score:', sortedKeywords[0]?.score);
  
  // Normalize the selected keyword for PubMed search
  const normalizedForPubMed = normalizeForPubMed(selectedKeyword);
  if (normalizedForPubMed !== selectedKeyword) {
    console.log(`NORMALIZED for PubMed: "${selectedKeyword}" -> "${normalizedForPubMed}"`);
  }
  console.log('==================================');
  
  return normalizedForPubMed;
}

function getBasicMedicalKeywords(text: string): string[] {
  // Enhanced basic medical keywords
  const basicTerms = [
    'fractura', 'dolor', 'lesion', 'tratamiento', 'cirugia', 'rehabilitacion',
    'fracture', 'pain', 'injury', 'treatment', 'surgery', 'rehabilitation',
    'ortopedia', 'traumatologia', 'orthopedic', 'trauma', 'bone', 'joint',
    'medical', 'clinical', 'diagnosis', 'therapy', 'patient'
  ];
  
  const foundTerms = basicTerms.filter(term => 
    text.toLowerCase().includes(term.toLowerCase())
  ).slice(0, 3);
  
  return foundTerms.length > 0 ? foundTerms : ['orthopedic', 'surgery', 'treatment'];
}

async function searchPubMed(keywords: string[]): Promise<{ articles: PubMedArticle[]; searchType: 'AND' | 'OR'; selectedKeyword?: string }> {
  try {
    const currentYear = new Date().getFullYear()
    const minYear = currentYear - 3
    
    // Phase 1: Search with AND (more specific)
    const andQuery = keywords.join(' AND ')
    const andSearchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(andQuery)}&mindate=${minYear}/01/01&maxdate=${currentYear}/12/31&retmax=10&retmode=json`
    
    console.log('Phase 1: Searching PubMed with AND:', { keywords, query: andQuery, searchUrl: andSearchUrl })
    
    let allArticles: PubMedArticle[] = []
    
    // First search with AND
    const andSearchResponse = await fetchWithRetry(andSearchUrl)
    if (!andSearchResponse.ok) {
      throw new Error(`PubMed AND search failed: ${andSearchResponse.status}`)
    }
    
    const andSearchData = await andSearchResponse.json()
    const andPmids = andSearchData.esearchresult?.idlist || []
    
    if (andPmids.length > 0) {
      const andDetailsUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${andPmids.join(',')}&retmode=xml`
      
      const andDetailsResponse = await fetchWithRetry(andDetailsUrl)
      if (!andDetailsResponse.ok) {
        console.warn(`PubMed AND details fetch failed: ${andDetailsResponse.status}`)
        // Continue without throwing to allow OR search
      } else {
      
        const andXmlText = await andDetailsResponse.text()
        allArticles = parsePubMedXML(andXmlText)
        console.log(`Phase 1 (AND): Found ${allArticles.length} articles`)
      }
    }
    
    // Phase 2: If we have 3 or fewer articles, search with OR for more results
    if (allArticles.length <= 3) {
      console.log('Phase 2: Insufficient results with AND, trying OR search...')
      
      // Use the most specific keyword for OR search to get relevant results
      const mostSpecificKeyword = selectMostSpecificKeyword(keywords)
      const orQuery = mostSpecificKeyword
      const orSearchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(orQuery)}&mindate=${minYear}/01/01&maxdate=${currentYear}/12/31&retmax=10&retmode=json`
      
      console.log('Phase 2: Searching PubMed with OR:', { mostSpecificKeyword, query: orQuery, searchUrl: orSearchUrl })
      
      const orSearchResponse = await fetchWithRetry(orSearchUrl)
      if (!orSearchResponse.ok) {
        console.warn(`PubMed OR search failed: ${orSearchResponse.status}`)
      } else {
        const orSearchData = await orSearchResponse.json()
        const orPmids = orSearchData.esearchresult?.idlist || []
        
        if (orPmids.length > 0) {
          const orDetailsUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${orPmids.join(',')}&retmode=xml`
          
          const orDetailsResponse = await fetchWithRetry(orDetailsUrl)
          if (!orDetailsResponse.ok) {
            console.warn(`PubMed OR details fetch failed: ${orDetailsResponse.status}`)
          } else {
            const orXmlText = await orDetailsResponse.text()
            const orArticles = parsePubMedXML(orXmlText)
            console.log(`Phase 2 (OR): Found ${orArticles.length} additional articles`)
            
            // Combine results, avoiding duplicates by PMID
            const existingPmids = new Set(allArticles.map(article => article.pmid))
            const newArticles = orArticles.filter(article => !existingPmids.has(article.pmid))
            
            allArticles = [...allArticles, ...newArticles]
            console.log(`Combined results: ${allArticles.length} unique articles (${newArticles.length} new from OR search)`)
            
            // Return with OR search type and selected keyword
            return {
              articles: allArticles,
              searchType: 'OR' as const,
              selectedKeyword: mostSpecificKeyword
            }
          }
        }
      }
    }
    
    if (allArticles.length === 0) {
      console.log('No articles found in PubMed with either AND or OR search')
    } else {
      console.log(`Final result: ${allArticles.length} PubMed articles`)
    }
    
    // Return with AND search type (either sufficient results or no OR search needed)
    return {
      articles: allArticles,
      searchType: 'AND' as const
    }
    
  } catch (error) {
    console.error('PubMed search error:', error)
    return {
      articles: [],
      searchType: 'AND' as const
    }
  }
}

function parsePubMedXML(xmlText: string): PubMedArticle[] {
  try {
    // Simple XML parsing for PubMed articles
    const articles: PubMedArticle[] = []
    
    // Extract PMID, title, authors, abstract, journal, year, DOI
    const articleRegex = /<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g
    let match
    
    while ((match = articleRegex.exec(xmlText)) !== null) {
      const articleXml = match[1]
      
      const pmidMatch = articleXml.match(/<PMID[^>]*>([^<]+)<\/PMID>/)
      const pmid = pmidMatch ? pmidMatch[1] : ''
      
      const titleMatch = articleXml.match(/<ArticleTitle>([^<]+)<\/ArticleTitle>/)
      const title = titleMatch ? titleMatch[1] : 'No title'
      
      const abstractMatch = articleXml.match(/<AbstractText[^>]*>([^<]+)<\/AbstractText>/)
      const abstract = abstractMatch ? abstractMatch[1] : 'No abstract available'
      
      const journalMatch = articleXml.match(/<Title>([^<]+)<\/Title>/)
      const journal = journalMatch ? journalMatch[1] : 'Unknown journal'
      
      const yearMatch = articleXml.match(/<Year>([^<]+)<\/Year>/)
      const year = yearMatch ? yearMatch[1] : new Date().getFullYear().toString()
      
      const doiMatch = articleXml.match(/<ELocationID[^>]*EIdType="doi"[^>]*>([^<]+)<\/ELocationID>/)
      const doi = doiMatch ? doiMatch[1] : ''
      
      // Extract authors
      const authorMatches = articleXml.match(/<Author[^>]*>[\s\S]*?<\/Author>/g) || []
      const authors = authorMatches.slice(0, 3).map(authorXml => {
        const lastNameMatch = authorXml.match(/<LastName>([^<]+)<\/LastName>/)
        const firstNameMatch = authorXml.match(/<ForeName>([^<]+)<\/ForeName>/)
        const lastName = lastNameMatch ? lastNameMatch[1] : ''
        const firstName = firstNameMatch ? firstNameMatch[1] : ''
        return `${firstName} ${lastName}`.trim()
      }).filter(name => name).join(', ')
      
      if (pmid && title) {
        articles.push({
          id: pmid,
          pmid,
          title: title.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'),
          authors: authors || 'Authors not available',
          abstract: abstract.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'),
          journal,
          year,
          doi,
          url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
        })
      }
    }
    
    return articles.slice(0, 10) // Limit to 10 articles
    
  } catch (error) {
    console.error('XML parsing error:', error)
    return []
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { prompt } = await req.json()
    
    if (!prompt || typeof prompt !== 'string') {
      throw new Error('Prompt is required')
    }

    console.log('Processing PubMed search for prompt:', prompt)

    const hfToken = Deno.env.get('HUGGINGFACE_API_TOKEN')
    if (!hfToken) {
      throw new Error('Hugging Face API token not configured')
    }

    const hf = new HfInference(hfToken)

    // Step 1: Translate Spanish to English
    const translatedQuery = await translateToEnglish(prompt, hf)
    console.log('Translated query:', translatedQuery)

    // Step 2: Extract keywords from translated query
    const keywords = await extractKeywords(translatedQuery, hf)
    console.log('Extracted keywords:', keywords)

    // Step 3: Search PubMed with keywords
    const searchResult = await searchPubMed(keywords)

    const result: PubMedSearchResult = {
      articles: searchResult.articles,
      keywords,
      translatedQuery,
      searchType: searchResult.searchType,
      selectedKeyword: searchResult.selectedKeyword
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('PubMed search function error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to search PubMed',
        details: (error as Error).message,
        articles: [],
        keywords: [],
        translatedQuery: ''
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})