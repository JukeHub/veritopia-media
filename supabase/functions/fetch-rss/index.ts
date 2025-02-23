
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function parseRSS(url: string) {
  try {
    const response = await fetch(url)
    const text = await response.text()
    
    // Parse XML using DOMParser
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(text, "text/xml")
    
    // Handle both RSS and Atom feeds
    const items = Array.from(xmlDoc.querySelectorAll('item, entry'))
    
    return items.map(item => {
      const title = item.querySelector('title')?.textContent || ''
      const link = item.querySelector('link')?.textContent || item.querySelector('link')?.getAttribute('href') || ''
      const description = item.querySelector('description, content')?.textContent || ''
      const pubDate = item.querySelector('pubDate, published')?.textContent || new Date().toISOString()
      
      return {
        title,
        link,
        description,
        pubDate: new Date(pubDate).toISOString()
      }
    })
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
    for (const source of sources) {
      try {
        console.log(`Fetching RSS feed for source ${source.id} from URL ${source.rss_url}`)
        const items = await parseRSS(source.rss_url)
        console.log(`Found ${items.length} items in RSS feed for source ${source.id}`)

        // Process each item in the feed
        for (const item of items) {
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
          } else {
            totalArticles++
          }
        }
      } catch (error) {
        console.error(`Error processing source ${source.id}:`, error)
      }
    }

    console.log(`Successfully processed ${totalArticles} articles in total`)

    return new Response(
      JSON.stringify({ 
        status: 'success', 
        message: `Feeds updated successfully. Processed ${totalArticles} articles.` 
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
