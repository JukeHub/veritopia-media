
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
        link,
        description,
        pubDate
      }
    })
  } catch (error) {
    console.error('Error parsing RSS feed:', error)
    throw error
  }
}

// Rate limiting helper
const rateLimitMap = new Map<string, number>()
async function rateLimitedFetch(sourceId: string, fn: () => Promise<any>) {
  const now = Date.now()
  const lastFetch = rateLimitMap.get(sourceId) || 0
  const minInterval = 1000 // Minimum 1 second between requests
  
  if (now - lastFetch < minInterval) {
    const delay = minInterval - (now - lastFetch)
    await new Promise(resolve => setTimeout(resolve, delay))
  }
  
  rateLimitMap.set(sourceId, Date.now())
  return fn()
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

    // Get all user subscriptions
    const { data: subscriptions, error: subError } = await supabaseClient
      .from('user_sources')
      .select('source_id')

    if (subError) {
      console.error('Error fetching subscriptions:', subError)
      throw subError
    }

    // Get unique source IDs
    const sourceIds = [...new Set(subscriptions.map(sub => sub.source_id))]
    console.log('Found subscription source IDs:', sourceIds)

    if (sourceIds.length === 0) {
      return new Response(
        JSON.stringify({ status: 'success', message: 'No sources to fetch' }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch sources that users are subscribed to
    const { data: sources, error: sourcesError } = await supabaseClient
      .from('sources')
      .select('id, rss_url')
      .in('id', sourceIds)

    if (sourcesError) {
      console.error('Error fetching sources:', sourcesError)
      throw sourcesError
    }

    console.log(`Found ${sources.length} sources to fetch`)

    let totalArticles = 0
    const errors: string[] = []

    for (const source of sources) {
      try {
        await rateLimitedFetch(source.id, async () => {
          console.log(`Processing source ${source.id}`)
          const items = await parseRSS(source.rss_url)
          console.log(`Found ${items.length} items in RSS feed for source ${source.id}`)

          // Process each item in the feed
          for (const item of items) {
            if (!item.title || !item.link) {
              console.warn('Skipping invalid item:', item)
              continue
            }

            const { error } = await supabaseClient
              .from('articles')
              .upsert({
                title: item.title,
                url: item.link,
                content: item.description,
                published_at: item.pubDate,
                source_id: source.id,
                verified: true,
              }, {
                onConflict: 'url'
              })

            if (error) {
              console.error(`Error inserting article from source ${source.id}:`, error)
              errors.push(`Failed to save article "${item.title}": ${error.message}`)
            } else {
              totalArticles++
            }
          }
        })
      } catch (error) {
        console.error(`Error processing source ${source.id}:`, error)
        errors.push(`Failed to process source ${source.id}: ${error.message}`)
      }
    }

    console.log(`Successfully processed ${totalArticles} articles in total`)
    if (errors.length > 0) {
      console.error(`Encountered ${errors.length} errors:`, errors)
    }

    return new Response(
      JSON.stringify({ 
        status: 'success', 
        message: `Feeds updated successfully. Processed ${totalArticles} articles.`,
        errors: errors.length > 0 ? errors : undefined
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in fetch-rss function:', error)
    return new Response(
      JSON.stringify({ error: error.message }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
