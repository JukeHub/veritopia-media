
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
    if (xmlData.rss?.channel?.item) {
      console.log('Found RSS 2.0 format')
      items = Array.isArray(xmlData.rss.channel.item) ? 
        xmlData.rss.channel.item : [xmlData.rss.channel.item]
    }
    
    // Try Atom format if no RSS items found
    if (items.length === 0 && xmlData.feed?.entry) {
      console.log('Found Atom format')
      items = Array.isArray(xmlData.feed.entry) ?
        xmlData.feed.entry : [xmlData.feed.entry]
    }
    
    // Try RSS 1.0 format if still no items
    if (items.length === 0 && xmlData['rdf:RDF']?.item) {
      console.log('Found RSS 1.0 format')
      items = Array.isArray(xmlData['rdf:RDF'].item) ?
        xmlData['rdf:RDF'].item : [xmlData['rdf:RDF'].item]
    }
    
    console.log(`Found ${items.length} items in feed`)
    
    const processedItems = items.map(item => {
      try {
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
        
        const title = getNodeText(item, ['title'])
        
        if (!title || !link) {
          console.log('Skipping item due to missing title or link:', { title, link })
          return null
        }
        
        return {
          title,
          url: link,
          content: description,
          published_at: pubDate,
          verified: true
        }
      } catch (e) {
        console.error('Error processing item:', e)
        return null
      }
    }).filter(Boolean)
    
    console.log(`Successfully processed ${processedItems.length} items`)
    return processedItems
  } catch (error) {
    console.error('Error parsing RSS feed:', error)
    throw error
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 200
    })
  }

  try {
    console.log('Starting RSS feed fetch...')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get all sources
    const { data: sources, error: sourcesError } = await supabaseClient
      .from('sources')
      .select('id, rss_url, name')

    if (sourcesError) {
      console.error('Error fetching sources:', sourcesError)
      throw sourcesError
    }

    console.log(`Found ${sources?.length || 0} sources to fetch`)

    if (!sources?.length) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No sources to process',
          results: [] 
        }), 
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
          status: 200
        }
      )
    }

    const results = []
    for (const source of sources) {
      try {
        console.log(`Processing source ${source.name} (${source.rss_url})`)
        const items = await parseRSS(source.rss_url)
        
        if (!items || items.length === 0) {
          console.log(`No valid items found for source ${source.name}`)
          continue
        }

        const articles = items.map(item => ({
          ...item,
          source_id: source.id
        }))

        // Try bulk upsert first
        const { error: bulkError } = await supabaseClient
          .from('articles')
          .upsert(articles)

        if (bulkError) {
          console.error('Bulk upsert failed, trying individual inserts')
          
          // If bulk fails, try individual inserts
          for (const article of articles) {
            try {
              const { error } = await supabaseClient
                .from('articles')
                .upsert(article)

              if (error) {
                console.error('Error inserting article:', error)
              } else {
                console.log(`Successfully inserted/updated: ${article.title}`)
              }
            } catch (e) {
              console.error('Error during individual insert:', e)
            }
          }
        } else {
          console.log(`Successfully bulk inserted ${articles.length} articles for ${source.name}`)
        }

        results.push({ 
          sourceId: source.id, 
          status: 'success', 
          count: articles.length 
        })
      } catch (error) {
        console.error(`Error processing source ${source.name}:`, error)
        results.push({ 
          sourceId: source.id, 
          status: 'error', 
          error: error.message 
        })
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'RSS feeds processed',
        results 
      }), 
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 200
      }
    )
  } catch (error) {
    console.error('Error in fetch-rss function:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }), 
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }, 
        status: 200 // Always return 200 to avoid Edge Function errors
      }
    )
  }
})
