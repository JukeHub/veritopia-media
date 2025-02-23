
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'
import { parse } from 'https://deno.land/x/xml@2.1.1/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper to safely extract text content from XML nodes
function getNodeText(node: any, path: string[]): string {
  try {
    let current = node
    for (const key of path) {
      if (!current[key]) return ''
      current = current[key]
    }
    // Handle both direct text and CDATA
    if (typeof current === 'string') return current
    if (current['#text']) return current['#text']
    if (current['#cdata']) return current['#cdata']
    return ''
  } catch (e) {
    console.error(`Error extracting path ${path.join('.')}:`, e)
    return ''
  }
}

async function parseRSS(url: string) {
  try {
    console.log(`Fetching RSS feed from ${url}`)
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; VeriLens/1.0; +http://verilens.app)'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const text = await response.text()
    console.log(`Received ${text.length} bytes of RSS data`)
    
    // Parse the XML
    const xmlData = parse(text)
    
    // Handle different feed formats (RSS 2.0, RSS 1.0, Atom)
    let items: any[] = []
    
    // Try RSS 2.0 format
    items = xmlData.rss?.channel?.item || []
    
    // Try Atom format if no RSS items found
    if (items.length === 0 && xmlData.feed?.entry) {
      items = xmlData.feed.entry
    }
    
    // Try RSS 1.0 format if still no items
    if (items.length === 0 && xmlData['rdf:RDF']?.item) {
      items = xmlData['rdf:RDF'].item
    }
    
    console.log(`Found ${items.length} items in feed`)
    
    return items.map(item => {
      // Handle different date formats
      let pubDate = ''
      try {
        const dateStr = getNodeText(item, ['pubDate']) || 
                       getNodeText(item, ['published']) ||
                       getNodeText(item, ['dc:date']) ||
                       new Date().toISOString()
        pubDate = new Date(dateStr).toISOString()
      } catch (e) {
        console.error('Error parsing date:', e)
        pubDate = new Date().toISOString()
      }
      
      // Handle different content formats
      const description = getNodeText(item, ['description']) ||
                         getNodeText(item, ['content']) ||
                         getNodeText(item, ['content:encoded']) ||
                         ''
      
      // Handle different link formats
      let link = getNodeText(item, ['link'])
      if (!link && item.link?._attributes?.href) {
        link = item.link._attributes.href
      }
      
      return {
        title: getNodeText(item, ['title']),
        url: link,
        content: description,
        published_at: pubDate,
        verified: true
      }
    }).filter(item => item.title && item.url) // Only return items with required fields
  } catch (error) {
    console.error('Error parsing RSS feed:', error)
    throw error
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting RSS feed fetch...')

    // Get all sources
    const { data: sources, error: sourcesError } = await supabaseClient
      .from('sources')
      .select('id, rss_url')

    if (sourcesError) {
      console.error('Error fetching sources:', sourcesError)
      throw sourcesError
    }

    console.log(`Found ${sources.length} sources to fetch`)

    const results = []
    for (const source of sources) {
      try {
        console.log(`Processing source ${source.id}`)
        const items = await parseRSS(source.rss_url)
        
        // Add source_id to each article
        const articles = items.map(item => ({
          ...item,
          source_id: source.id
        }))

        // Insert articles with upsert
        for (const article of articles) {
          const { error } = await supabaseClient
            .from('articles')
            .upsert(article)

          if (error) {
            console.error(`Error inserting article from source ${source.id}:`, error)
            results.push({ 
              sourceId: source.id, 
              status: 'error', 
              error: error.message,
              article: article 
            })
          } else {
            console.log(`Successfully inserted article from source ${source.id}:`, article.title)
          }
        }

        results.push({ 
          sourceId: source.id, 
          status: 'success', 
          count: articles.length 
        })
      } catch (error) {
        console.error(`Error processing source ${source.id}:`, error)
        results.push({ sourceId: source.id, status: 'error', error: error.message })
      }
    }

    return new Response(
      JSON.stringify({ 
        status: 'success', 
        message: `RSS feeds processed`,
        results 
      }), 
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  } catch (error) {
    console.error('Error in fetch-rss function:', error)
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }, 
        status: 500 
      }
    )
  }
})
