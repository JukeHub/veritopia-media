
import React, { useState } from 'react';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { Database } from '@/lib/database.types';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";

type Source = Database['public']['Tables']['sources']['Row'];
type UserSource = Database['public']['Tables']['user_sources']['Row'];

export const SourceManager = () => {
  const session = useSession();
  const supabase = useSupabaseClient<Database>();
  const { toast } = useToast();
  const [sources, setSources] = React.useState<Source[]>([]);
  const [userSources, setUserSources] = React.useState<UserSource[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [newSource, setNewSource] = useState({
    name: '',
    url: '',
    description: '',
  });

  const fetchSources = async () => {
    try {
      const { data: sourcesData, error: sourcesError } = await supabase
        .from('sources')
        .select('*');

      if (sourcesError) throw sourcesError;

      const { data: userSourcesData, error: userSourcesError } = await supabase
        .from('user_sources')
        .select('*')
        .eq('user_id', session?.user?.id);

      if (userSourcesError) throw userSourcesError;

      setSources(sourcesData || []);
      setUserSources(userSourcesData || []);
    } catch (error: any) {
      toast({
        title: "Error fetching sources",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitSource = async () => {
    if (!session?.user?.id) return;

    try {
      const { data, error } = await supabase
        .from('sources')
        .insert([
          {
            name: newSource.name,
            url: newSource.url,
            description: newSource.description,
            rss_url: newSource.url, // Using the same URL as RSS URL for now
          },
        ])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Source added successfully",
        description: "The news source has been added to the system.",
      });

      // Add the source to user's sources
      if (data) {
        const { error: userSourceError } = await supabase
          .from('user_sources')
          .insert([
            {
              user_id: session.user.id,
              source_id: data.id,
            },
          ]);

        if (userSourceError) throw userSourceError;
      }

      setNewSource({ name: '', url: '', description: '' });
      fetchSources();
    } catch (error: any) {
      toast({
        title: "Error adding source",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleFollowSource = async (sourceId: string) => {
    if (!session?.user?.id) return;

    const isFollowing = userSources.some(us => us.source_id === sourceId);

    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('user_sources')
          .delete()
          .eq('user_id', session.user.id)
          .eq('source_id', sourceId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_sources')
          .insert([
            {
              user_id: session.user.id,
              source_id: sourceId,
            },
          ]);

        if (error) throw error;
      }

      fetchSources();
      toast({
        title: isFollowing ? "Source unfollowed" : "Source followed",
        description: isFollowing 
          ? "You will no longer see articles from this source" 
          : "You will now see articles from this source",
      });
    } catch (error: any) {
      toast({
        title: "Error updating source",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  React.useEffect(() => {
    if (session?.user?.id) {
      fetchSources();
    }
  }, [session?.user?.id]);

  if (loading) {
    return <div>Loading sources...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">News Sources</h3>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Source
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add News Source</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Input
                  placeholder="Source Name"
                  value={newSource.name}
                  onChange={(e) => setNewSource(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Input
                  placeholder="Website URL"
                  value={newSource.url}
                  onChange={(e) => setNewSource(prev => ({ ...prev, url: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Input
                  placeholder="Description"
                  value={newSource.description}
                  onChange={(e) => setNewSource(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <Button onClick={handleSubmitSource} className="w-full">
                Add Source
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sources.map((source) => {
          const isFollowing = userSources.some(us => us.source_id === source.id);
          return (
            <div
              key={source.id}
              className="p-4 rounded-lg border bg-white dark:bg-gray-800"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold">{source.name}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{source.description}</p>
                </div>
                <Button
                  variant={isFollowing ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleFollowSource(source.id)}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
