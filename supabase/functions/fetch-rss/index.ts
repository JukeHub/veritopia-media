
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'
import { parse } from 'https://deno.land/x/rss/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    if (subError) throw subError

    // Get unique source IDs
    const sourceIds = [...new Set(subscriptions.map(sub => sub.source_id))]

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

    if (sourcesError) throw sourcesError

    console.log(`Found ${sources.length} sources to fetch`)

    for (const source of sources) {
      try {
        console.log(`Fetching RSS feed for source ${source.id}`)
        const response = await fetch(source.rss_url)
        const xml = await response.text()
        const feed = await parse(xml)

        // Process each item in the feed
        for (const item of feed.entries) {
          const { error } = await supabaseClient
            .from('articles')
            .upsert({
              title: item.title?.value,
              url: item.links[0]?.href,
              content: item.description?.value,
              published_at: item.published,
              source_id: source.id,
              verified: true,
            }, {
              onConflict: 'url'
            })

          if (error) {
            console.error(`Error inserting article: ${error.message}`)
          }
        }
      } catch (error) {
        console.error(`Error processing source ${source.id}: ${error}`)
      }
    }

    return new Response(
      JSON.stringify({ status: 'success', message: 'Feeds updated successfully' }), 
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
