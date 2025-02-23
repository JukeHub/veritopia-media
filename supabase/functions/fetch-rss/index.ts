
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
    console.log('Parsed XML structure:', JSON.stringify(xmlData, null, 2))
    
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
    
    console.log(`Found ${items.length} items in feed. First item:`, JSON.stringify(items[0], null, 2))
    
    const processedItems = items.map(item => {
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
      
      const processedItem = {
        title: getNodeText(item, ['title']),
        url: link,
        content: description,
        published_at: pubDate,
        verified: true
      }
      
      console.log('Processed item:', JSON.stringify(processedItem, null, 2))
      
      return processedItem
    }).filter(item => {
      if (!item.title || !item.url) {
        console.log('Filtering out item due to missing title or url:', JSON.stringify(item, null, 2))
        return false
      }
      return true
    })
    
    console.log(`Returning ${processedItems.length} valid items`)
    return processedItems
    
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
    console.log('Starting RSS feed fetch with debug logging...')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // First, verify the unique constraint
    const { data: tableInfo, error: tableError } = await supabaseClient
      .rpc('check_constraint_exists', { 
        table_name: 'articles',
        constraint_name: 'articles_url_key'
      })
    
    console.log('Constraint check result:', tableInfo, tableError)

    // Get all sources
    const { data: sources, error: sourcesError } = await supabaseClient
      .from('sources')
      .select('id, rss_url, name')

    if (sourcesError) {
      console.error('Error fetching sources:', sourcesError)
      throw sourcesError
    }

    console.log(`Found ${sources?.length || 0} sources to fetch:`, JSON.stringify(sources, null, 2))

    if (!sources?.length) {
      return new Response(
        JSON.stringify({ 
          status: 'success', 
          message: 'No sources to process',
          results: [] 
        }), 
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }

    const results = []
    for (const source of sources) {
      try {
        console.log(`Processing source ${source.id} (${source.name}): ${source.rss_url}`)
        const items = await parseRSS(source.rss_url)
        
        console.log(`Successfully parsed ${items.length} items from ${source.name}`)
        
        // Add source_id to each article
        const articles = items.map(item => ({
          ...item,
          source_id: source.id
        }))

        // First try bulk upsert
        const { error: bulkError } = await supabaseClient
          .from('articles')
          .upsert(articles, {
            onConflict: 'url'
          })

        if (bulkError) {
          console.error(`Bulk upsert failed for source ${source.id}, trying individual inserts:`, bulkError)
          
          // If bulk fails, try individual inserts
          for (const article of articles) {
            const { error } = await supabaseClient
              .from('articles')
              .upsert(article, {
                onConflict: 'url'
              })

            if (error) {
              console.error(`Error inserting article from source ${source.id}:`, error)
              console.error('Failed article data:', JSON.stringify(article, null, 2))
              results.push({ 
                sourceId: source.id, 
                status: 'error', 
                error: error.message,
                article: article 
              })
            } else {
              console.log(`Successfully inserted/updated article: ${article.title}`)
            }
          }
        } else {
          console.log(`Successfully bulk upserted ${articles.length} articles for source ${source.id}`)
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
