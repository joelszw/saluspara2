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
  try {
    console.log('Extracting keywords from:', text);
    
    // Use a more appropriate model for medical keyword extraction
    const result = await hf.textGeneration({
      model: 'microsoft/BioGPT-Large',
      inputs: `Medical keywords from: "${text}"\nKeywords:`,
      parameters: {
        max_new_tokens: 30,
        temperature: 0.1,
        do_sample: false,
      },
    });
    
    console.log('Raw keyword extraction result:', result);
    
    if (result && typeof result === 'object' && 'generated_text' in result) {
      const keywords = result.generated_text
        .replace(`Medical keywords from: "${text}"\nKeywords:`, '')
        .split(/[,\n]/)
        .map(k => k.trim())
        .filter(k => k.length > 2 && k.length < 30 && !k.includes(':'))
        .slice(0, 5);
      
      console.log('Extracted keywords:', keywords);
      return keywords.length > 0 ? keywords : getBasicMedicalKeywords(text);
    }
    
    return getBasicMedicalKeywords(text);
  } catch (error) {
    console.warn('Keyword extraction failed:', error);
    return getBasicMedicalKeywords(text);
  }
}

function getBasicMedicalKeywords(text: string): string[] {
  // Extract basic medical keywords from common terms
  const medicalTerms = [
    'fractura', 'dolor', 'lesion', 'tratamiento', 'cirugia', 'rehabilitacion',
    'fracture', 'pain', 'injury', 'treatment', 'surgery', 'rehabilitation',
    'ortopedia', 'traumatologia', 'orthopedic', 'trauma', 'bone', 'joint'
  ];
  
  const foundTerms = medicalTerms.filter(term => 
    text.toLowerCase().includes(term.toLowerCase())
  ).slice(0, 3);
  
  return foundTerms.length > 0 ? [...foundTerms, 'medical', 'treatment'] : ['medical', 'treatment', 'diagnosis'];
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