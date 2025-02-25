
import React from 'react';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { Database } from '@/lib/database.types';
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";

type Article = Database['public']['Tables']['articles']['Row'];

export const NewsFeed = () => {
  const session = useSession();
  const supabase = useSupabaseClient<Database>();
  const { toast } = useToast();
  const [articles, setArticles] = React.useState<Article[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [newArticle, setNewArticle] = React.useState({
    title: '',
    url: '',
    content: '',
    image_url: '',
  });

  const fetchArticles = async () => {
    if (!session?.user?.id) return;

    try {
      const { data, error } = await supabase
        .from('articles')
        .select('*, sources(*)')
        .order('published_at', { ascending: false });

      if (error) throw error;
      setArticles(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching articles",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitArticle = async () => {
    if (!session?.user?.id) return;

    try {
      const { error } = await supabase
        .from('articles')
        .insert([
          {
            ...newArticle,
            user_id: session.user.id,
            published_at: new Date().toISOString(),
          },
        ]);

      if (error) throw error;

      toast({
        title: "Article submitted successfully",
        description: "Your article has been added to the feed.",
      });

      setNewArticle({
        title: '',
        url: '',
        content: '',
        image_url: '',
      });

      fetchArticles();
    } catch (error: any) {
      toast({
        title: "Error submitting article",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  React.useEffect(() => {
    if (session?.user?.id) {
      fetchArticles();
    }
  }, [session?.user?.id]);

  if (loading) {
    return <div>Loading articles...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">News Feed</h3>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Submit Article
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit New Article</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Article Title"
                  value={newArticle.title}
                  onChange={(e) => setNewArticle(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  placeholder="Article URL"
                  value={newArticle.url}
                  onChange={(e) => setNewArticle(prev => ({ ...prev, url: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Summary</Label>
                <Input
                  id="content"
                  placeholder="Brief summary"
                  value={newArticle.content || ''}
                  onChange={(e) => setNewArticle(prev => ({ ...prev, content: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="image">Image URL</Label>
                <Input
                  id="image"
                  placeholder="Image URL (optional)"
                  value={newArticle.image_url || ''}
                  onChange={(e) => setNewArticle(prev => ({ ...prev, image_url: e.target.value }))}
                />
              </div>
              <Button onClick={handleSubmitArticle} className="w-full">
                Submit Article
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {articles.map((article) => (
          <Card key={article.id}>
            <CardHeader>
              <CardTitle>
                <a 
                  href={article.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {article.title}
                </a>
              </CardTitle>
              <CardDescription>
                {new Date(article.published_at || article.created_at).toLocaleDateString()}
                {article.verified && ' • Verified'}
              </CardDescription>
            </CardHeader>
            {article.content && (
              <CardContent>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {article.content}
                </p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};
