import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { HfInference } from 'https://esm.sh/@huggingface/inference@2.3.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    // Orthopedic specific terms
    orthopedic: ['hallux', 'valgus', 'abductus', 'bunion', 'metatarsal', 'phalanx', 'osteotomy', 'arthrodesis', 'arthroplasty'],
    // Surgical approaches
    surgical: ['mis', 'minimally invasive', 'percutaneous', 'open', 'arthroscopic', 'endoscopic', 'laparoscopic'],
    // General medical terms
    anatomy: ['bone', 'joint', 'ligament', 'tendon', 'cartilage', 'muscle', 'nerve', 'artery', 'vein'],
    pathology: ['fracture', 'rupture', 'tear', 'sprain', 'strain', 'inflammation', 'infection', 'deformity'],
    treatment: ['surgery', 'rehabilitation', 'therapy', 'treatment', 'management', 'protocol', 'technique']
  };
  
  const extractedKeywords = new Set<string>();
  
  // Extract medical terms from all categories
  Object.values(medicalTerms).flat().forEach(term => {
    if (lowerText.includes(term.toLowerCase())) {
      extractedKeywords.add(term);
    }
  });
  
  // Extract capitalized medical terms (likely proper nouns or technical terms)
  const capitalizedTerms = originalText.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
  capitalizedTerms.forEach(term => {
    if (term.length > 3 && term.length < 20) {
      extractedKeywords.add(term);
    }
  });
  
  // Extract terms with specific patterns (medical abbreviations)
  const abbreviations = originalText.match(/\b[A-Z]{2,5}\b/g) || [];
  abbreviations.forEach(abbr => {
    if (abbr.length >= 2 && abbr.length <= 5) {
      extractedKeywords.add(abbr);
    }
  });
  
  // Extract Latin/medical terms (words ending in common medical suffixes)
  const latinSuffixes = ['itis', 'osis', 'oma', 'ia', 'us', 'um', 'al', 'ic'];
  const words = originalText.split(/\s+/);
  words.forEach(word => {
    const cleanWord = word.replace(/[^\w]/g, '').toLowerCase();
    if (cleanWord.length > 4) {
      latinSuffixes.forEach(suffix => {
        if (cleanWord.endsWith(suffix)) {
          extractedKeywords.add(cleanWord);
        }
      });
    }
  });
  
  // Convert to array and prioritize
  const keywordArray = Array.from(extractedKeywords);
  
  // Prioritize orthopedic terms if found
  const orthopedicTerms = keywordArray.filter(kw => 
    medicalTerms.orthopedic.some(term => kw.toLowerCase().includes(term.toLowerCase()))
  );
  
  // Prioritize surgical terms
  const surgicalTerms = keywordArray.filter(kw => 
    medicalTerms.surgical.some(term => kw.toLowerCase().includes(term.toLowerCase()))
  );
  
  // Build final keyword list with prioritization
  const finalKeywords = [
    ...orthopedicTerms,
    ...surgicalTerms,
    ...keywordArray.filter(kw => !orthopedicTerms.includes(kw) && !surgicalTerms.includes(kw))
  ].slice(0, 5);
  
  console.log('Advanced extraction results:', {
    foundTerms: keywordArray,
    orthopedicTerms,
    surgicalTerms,
    finalKeywords
  });
  
  // Fallback to basic terms if nothing found
  if (finalKeywords.length === 0) {
    console.log('No specific terms found, using fallback keywords');
    return getBasicMedicalKeywords(text);
  }
  
  return finalKeywords;
}

function selectMostSpecificKeyword(keywords: string[]): string {
  console.log('Selecting most specific keyword from:', keywords);
  
  const scoredKeywords = keywords.map(keyword => {
    let score = 0;
    const lowerKeyword = keyword.toLowerCase();
    
    // Specific pathologies (highest priority)
    const pathologies = ['exóstosis', 'exostosis', 'neuroma', 'bursitis', 'hallux', 'metatarsalgia', 'fasciitis'];
    if (pathologies.some(path => lowerKeyword.includes(path))) {
      score += 10;
    }
    
    // Specific anatomy
    const anatomy = ['interdigital', 'plantar', 'dorsal', 'medial', 'lateral', 'proximal', 'distal'];
    if (anatomy.some(anat => lowerKeyword.includes(anat))) {
      score += 8;
    }
    
    // Specific procedures
    const procedures = ['osteotomy', 'arthrodesis', 'arthroplasty', 'resection', 'excision'];
    if (procedures.some(proc => lowerKeyword.includes(proc))) {
      score += 6;
    }
    
    // Technical terms
    const technical = ['minimally', 'invasive', 'percutaneous', 'arthroscopic', 'endoscopic'];
    if (technical.some(tech => lowerKeyword.includes(tech))) {
      score += 4;
    }
    
    // Penalize generic terms
    const generic = ['tratamiento', 'treatment', 'cirugía', 'surgery', 'terapia', 'therapy', 'manejo', 'management'];
    if (generic.some(gen => lowerKeyword.includes(gen))) {
      score -= 5;
    }
    
    // Bonus for longer, more specific terms
    if (keyword.length > 6) {
      score += 2;
    }
    
    // Bonus for Latin/medical endings
    const medicalEndings = ['osis', 'itis', 'oma', 'ia', 'us', 'um'];
    if (medicalEndings.some(ending => lowerKeyword.endsWith(ending))) {
      score += 3;
    }
    
    console.log(`Keyword "${keyword}" scored: ${score}`);
    return { keyword, score };
  });
  
  // Sort by score (highest first) and return the best keyword
  const sortedKeywords = scoredKeywords.sort((a, b) => b.score - a.score);
  const selectedKeyword = sortedKeywords[0]?.keyword || keywords[0];
  
  console.log('Selected keyword for OR search:', selectedKeyword, 'with score:', sortedKeywords[0]?.score);
  return selectedKeyword;
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
    const andSearchResponse = await fetch(andSearchUrl)
    if (!andSearchResponse.ok) {
      throw new Error(`PubMed AND search failed: ${andSearchResponse.status}`)
    }
    
    const andSearchData = await andSearchResponse.json()
    const andPmids = andSearchData.esearchresult?.idlist || []
    
    if (andPmids.length > 0) {
      const andDetailsUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${andPmids.join(',')}&retmode=xml`
      
      const andDetailsResponse = await fetch(andDetailsUrl)
      if (!andDetailsResponse.ok) {
        throw new Error(`PubMed AND details fetch failed: ${andDetailsResponse.status}`)
      }
      
      const andXmlText = await andDetailsResponse.text()
      allArticles = parsePubMedXML(andXmlText)
      console.log(`Phase 1 (AND): Found ${allArticles.length} articles`)
    }
    
    // Phase 2: If we have 3 or fewer articles, search with OR for more results
    if (allArticles.length <= 3) {
      console.log('Phase 2: Insufficient results with AND, trying OR search...')
      
      // Use the most specific keyword for OR search to get relevant results
      const mostSpecificKeyword = selectMostSpecificKeyword(keywords)
      const orQuery = mostSpecificKeyword
      const orSearchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(orQuery)}&mindate=${minYear}/01/01&maxdate=${currentYear}/12/31&retmax=10&retmode=json`
      
      console.log('Phase 2: Searching PubMed with OR:', { mostSpecificKeyword, query: orQuery, searchUrl: orSearchUrl })
      
      const orSearchResponse = await fetch(orSearchUrl)
      if (!orSearchResponse.ok) {
        console.warn(`PubMed OR search failed: ${orSearchResponse.status}`)
      } else {
        const orSearchData = await orSearchResponse.json()
        const orPmids = orSearchData.esearchresult?.idlist || []
        
        if (orPmids.length > 0) {
          const orDetailsUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${orPmids.join(',')}&retmode=xml`
          
          const orDetailsResponse = await fetch(orDetailsUrl)
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
    return []
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
        details: error.message,
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