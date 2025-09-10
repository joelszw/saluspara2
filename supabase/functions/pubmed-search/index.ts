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

async function searchPubMed(keywords: string[]): Promise<PubMedArticle[]> {
  try {
    const currentYear = new Date().getFullYear()
    const minYear = currentYear - 3
    const query = keywords.join(' AND ')
    
    // Search PubMed for article IDs
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&mindate=${minYear}/01/01&maxdate=${currentYear}/12/31&retmax=10&retmode=json`
    
    console.log('Searching PubMed with:', { keywords, query, searchUrl })
    
    const searchResponse = await fetch(searchUrl)
    if (!searchResponse.ok) {
      throw new Error(`PubMed search failed: ${searchResponse.status}`)
    }
    
    const searchData = await searchResponse.json()
    const pmids = searchData.esearchresult?.idlist || []
    
    if (pmids.length === 0) {
      console.log('No articles found in PubMed')
      return []
    }
    
    // Fetch detailed information for each article
    const detailsUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmids.join(',')}&retmode=xml`
    
    const detailsResponse = await fetch(detailsUrl)
    if (!detailsResponse.ok) {
      throw new Error(`PubMed details fetch failed: ${detailsResponse.status}`)
    }
    
    const xmlText = await detailsResponse.text()
    const articles = parsePubMedXML(xmlText)
    
    console.log(`Found ${articles.length} PubMed articles`)
    return articles
    
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
    const articles = await searchPubMed(keywords)

    const result: PubMedSearchResult = {
      articles,
      keywords,
      translatedQuery
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