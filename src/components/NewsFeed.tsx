
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useSession } from '@supabase/auth-helpers-react'

const NewsFeed = () => {
  const { toast } = useToast()
  const session = useSession()

  // Add console logs to debug the data fetching process
  const { data: articles, isLoading, refetch } = useQuery({
    queryKey: ['articles', session?.user?.id],
    queryFn: async () => {
      console.log('Fetching articles for user:', session?.user?.id)
      
      if (!session?.user?.id) {
        console.log('No user session, returning empty array')
        return []
      }
      
      const { data: userSources, error: sourcesError } = await supabase
        .from('user_sources')
        .select('source_id')
        .eq('user_id', session.user.id)

      if (sourcesError) {
        console.error('Error fetching user sources:', sourcesError)
        throw sourcesError
      }

      console.log('User sources:', userSources)

      const sourceIds = userSources.map(us => us.source_id)
      
      if (sourceIds.length === 0) {
        console.log('No sources subscribed, returning empty array')
        return []
      }

      console.log('Fetching articles for sources:', sourceIds)

      const { data, error } = await supabase
        .from('articles')
        .select(`
          *,
          sources (
            name,
            logo_url
          )
        `)
        .in('source_id', sourceIds)
        .order('published_at', { ascending: false })
        .limit(20)

      if (error) {
        console.error('Error fetching articles:', error)
        throw error
      }

      console.log('Fetched articles:', data)
      return data
    },
    enabled: !!session?.user?.id
  })

  const refreshFeeds = async () => {
    try {
      console.log('Refreshing feeds...')
      const { data, error } = await supabase.functions.invoke('fetch-rss')
      console.log('Refresh response:', data, error)
      
      if (error) throw error
      
      await refetch()
      toast({
        title: "Feeds refreshed",
        description: "Your news feed has been updated with the latest articles.",
      })
    } catch (error: any) {
      console.error('Error refreshing feeds:', error)
      toast({
        title: "Error refreshing feeds",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    if (session?.user?.id) {
      console.log('Initial feed refresh for user:', session.user.id)
      refreshFeeds()
    }
  }, [session?.user?.id])

  if (!session) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold mb-4">Welcome to VeriLens</h2>
        <p className="text-gray-600">Please sign in to view your personalized news feed.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!articles || articles.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">News Feed</h2>
          <Button onClick={refreshFeeds}>Refresh Feeds</Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>No articles found</CardTitle>
            <CardDescription>
              Try subscribing to some news sources in the Manage Sources section.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">News Feed</h2>
        <Button onClick={refreshFeeds}>Refresh Feeds</Button>
      </div>
      
      {articles?.map((article) => (
        <Card key={article.id}>
          <CardHeader>
            <div className="flex items-center gap-2">
              {article.sources?.logo_url && (
                <img 
                  src={article.sources.logo_url} 
                  alt={article.sources.name} 
                  className="h-6 w-6 object-contain"
                />
              )}
              <CardTitle>{article.title}</CardTitle>
            </div>
            <CardDescription>
              From {article.sources?.name} • {
                new Date(article.published_at).toLocaleDateString()
              }
            </CardDescription>
          </CardHeader>
          {article.content && (
            <CardContent>
              <div 
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: article.content }}
              />
            </CardContent>
          )}
          <CardFooter>
            <Button variant="outline" asChild>
              <a href={article.url} target="_blank" rel="noopener noreferrer">
                Read More
              </a>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

export default NewsFeed

