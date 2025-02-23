
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

  const { data: articles, isLoading } = useQuery({
    queryKey: ['articles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('articles')
        .select(`
          *,
          sources (
            name,
            logo_url
          )
        `)
        .order('published_at', { ascending: false })
        .limit(20)

      if (error) throw error
      return data
    },
  })

  const refreshFeeds = async () => {
    try {
      await supabase.functions.invoke('fetch-rss')
      toast({
        title: "Feeds refreshed",
        description: "Your news feed has been updated with the latest articles.",
      })
    } catch (error) {
      toast({
        title: "Error refreshing feeds",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    refreshFeeds()
  }, [])

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
