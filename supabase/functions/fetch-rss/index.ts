
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'
import { parse } from 'https://deno.land/x/xml@2.1.1/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function parseRSS(url: string) {
  try {
    if (!url) throw new Error('No URL provided')
    
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const text = await response.text()
    if (!text) throw new Error('Empty response from feed')
    
    const xmlData = parse(text)
    if (!xmlData) throw new Error('Failed to parse XML')
    
    let items: any[] = []
    
    // RSS 2.0
    if (xmlData.rss?.channel?.item) {
      items = Array.isArray(xmlData.rss.channel.item) ? 
        xmlData.rss.channel.item : [xmlData.rss.channel.item]
    }
    // Atom
    else if (xmlData.feed?.entry) {
      items = Array.isArray(xmlData.feed.entry) ?
        xmlData.feed.entry : [xmlData.feed.entry]
    }
    // RSS 1.0
    else if (xmlData['rdf:RDF']?.item) {
      items = Array.isArray(xmlData['rdf:RDF'].item) ?
        xmlData['rdf:RDF'].item : [xmlData['rdf:RDF'].item]
    }
    
    if (!items || items.length === 0) {
      throw new Error('No items found in feed')
    }
    
    return items.map(item => {
      if (!item) return null
      
      const title = item.title?._text || item.title?._cdata || item.title || ''
      const link = item.link?._text || item.link?._cdata || item.link || ''
      const content = item.description?._text || item.description?._cdata || 
                     item.content?._text || item.content?._cdata ||
                     item['content:encoded']?._text || item['content:encoded']?._cdata || ''
      
      const pubDate = item.pubDate?._text || item.pubDate?._cdata ||
                     item.published?._text || item.published?._cdata ||
                     item['dc:date']?._text || item['dc:date']?._cdata ||
                     new Date().toISOString()
      
      // Skip invalid items
      if (!title || !link) return null
      
      return {
        title,
        url: link,
        content,
        published_at: new Date(pubDate).toISOString(),
        verified: true
      }
    }).filter(Boolean)
  } catch (error) {
    console.error('Error parsing RSS feed:', error)
    throw error
  }
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 200
    })
  }
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials')
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Get sources
    const { data: sources, error: sourcesError } = await supabase
      .from('sources')
      .select('id, rss_url, name')
    
    if (sourcesError) throw sourcesError
    if (!sources) throw new Error('No sources found')
    
    const results = []
    
    for (const source of sources) {
      try {
        if (!source.rss_url) {
          console.error(`Missing RSS URL for source ${source.name}`)
          continue
        }
        
        const items = await parseRSS(source.rss_url)
        if (!items || items.length === 0) continue
        
        const articles = items.map(item => ({
          ...item,
          source_id: source.id
        }))
        
        // Insert articles one by one to avoid bulk insert issues
        for (const article of articles) {
          const { error } = await supabase
            .from('articles')
            .upsert(article, {
              onConflict: 'url'
            })
          
          if (error) {
            console.error('Error inserting article:', error)
          }
        }
        
        results.push({
          source: source.name,
          count: articles.length,
          status: 'success'
        })
        
      } catch (error) {
        console.error(`Error processing source ${source.name}:`, error)
        results.push({
          source: source.name,
          error: error.message,
          status: 'error'
        })
      }
    }
    
    return new Response(
      JSON.stringify({ success: true, results }), 
      { 
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Function error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200 // Keep 200 to avoid edge function errors
      }
    )
  }
})
