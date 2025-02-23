
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useSession } from '@supabase/auth-helpers-react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle, XCircle } from 'lucide-react'

const SourceManager = () => {
  const { toast } = useToast()
  const session = useSession()
  const queryClient = useQueryClient()
  const [newSource, setNewSource] = useState({ name: '', url: '', rss_url: '' })

  const { data: sources, isLoading: sourcesLoading } = useQuery({
    queryKey: ['sources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sources')
        .select('*')
      if (error) throw error
      return data
    },
  })

  const { data: userSources, isLoading: userSourcesLoading } = useQuery({
    queryKey: ['user-sources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_sources')
        .select('source_id')
      if (error) throw error
      return data.map(us => us.source_id)
    },
  })

  const addSourceMutation = useMutation({
    mutationFn: async (sourceData: typeof newSource) => {
      const { data, error } = await supabase
        .from('sources')
        .insert(sourceData)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] })
      setNewSource({ name: '', url: '', rss_url: '' })
      toast({
        title: "Source added",
        description: "The news source has been added successfully.",
      })
    },
    onError: (error) => {
      toast({
        title: "Error adding source",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const toggleSubscriptionMutation = useMutation({
    mutationFn: async ({ sourceId, subscribed }: { sourceId: string, subscribed: boolean }) => {
      if (subscribed) {
        const { error } = await supabase
          .from('user_sources')
          .delete()
          .eq('source_id', sourceId)
          .eq('user_id', session?.user.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('user_sources')
          .insert({
            source_id: sourceId,
            user_id: session?.user.id,
          })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-sources'] })
      toast({
        title: "Subscription updated",
        description: "Your feed preferences have been updated.",
      })
    },
    onError: (error) => {
      toast({
        title: "Error updating subscription",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addSourceMutation.mutate(newSource)
  }

  if (sourcesLoading || userSourcesLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add New Source</CardTitle>
          <CardDescription>Add a new RSS feed source to the platform</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name">Source Name</label>
              <Input
                id="name"
                value={newSource.name}
                onChange={e => setNewSource(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="url">Website URL</label>
              <Input
                id="url"
                type="url"
                value={newSource.url}
                onChange={e => setNewSource(prev => ({ ...prev, url: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="rss_url">RSS Feed URL</label>
              <Input
                id="rss_url"
                type="url"
                value={newSource.rss_url}
                onChange={e => setNewSource(prev => ({ ...prev, rss_url: e.target.value }))}
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={addSourceMutation.isPending}>
              Add Source
            </Button>
          </CardFooter>
        </form>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sources?.map(source => {
          const isSubscribed = userSources?.includes(source.id)
          return (
            <Card key={source.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {source.name}
                  {isSubscribed ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-300" />
                  )}
                </CardTitle>
                <CardDescription>{source.url}</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button
                  variant={isSubscribed ? "outline" : "default"}
                  onClick={() => toggleSubscriptionMutation.mutate({
                    sourceId: source.id,
                    subscribed: isSubscribed,
                  })}
                >
                  {isSubscribed ? "Unsubscribe" : "Subscribe"}
                </Button>
              </CardFooter>
            </Card>
          )}
        )}
      </div>
    </div>
  )
}

export default SourceManager
