
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";

type Article = Database['public']['Tables']['articles']['Row'];

export const NewsFeed = () => {
  const session = useSession();
  const supabase = useSupabaseClient<Database>();
  const { toast } = useToast();
  const [articles, setArticles] = React.useState<Article[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [articleUrl, setArticleUrl] = React.useState('');

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
    if (!session?.user?.id || !articleUrl) return;

    setSubmitting(true);

    try {
      // Extract a basic title from the URL by removing common elements
      const urlObject = new URL(articleUrl);
      const pathSegments = urlObject.pathname.split('/').filter(Boolean);
      const lastSegment = pathSegments[pathSegments.length - 1] || urlObject.hostname;
      const basicTitle = lastSegment
        .replace(/[-_]/g, ' ') // Replace dashes and underscores with spaces
        .replace(/\.\w+$/, '') // Remove file extensions
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

      const { error } = await supabase
        .from('articles')
        .insert([
          {
            url: articleUrl,
            title: basicTitle,
            user_id: session.user.id,
            published_at: new Date().toISOString(),
          },
        ]);

      if (error) throw error;

      toast({
        title: "Article submitted successfully",
        description: "Your article has been added to the feed.",
      });

      setArticleUrl('');
      await fetchArticles(); // Wait for the articles to be fetched
    } catch (error: any) {
      toast({
        title: "Error submitting article",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteArticle = async (articleId: string) => {
    if (!session?.user?.id) return;

    try {
      const { error } = await supabase
        .from('articles')
        .delete()
        .eq('id', articleId)
        .eq('user_id', session.user.id);

      if (error) throw error;

      setArticles(articles.filter(article => article.id !== articleId)); // Update local state immediately

      toast({
        title: "Article deleted",
        description: "The article has been removed from your feed.",
      });
    } catch (error: any) {
      toast({
        title: "Error deleting article",
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
                <Input
                  placeholder="Article URL"
                  value={articleUrl}
                  onChange={(e) => setArticleUrl(e.target.value)}
                  type="url"
                />
              </div>
              <Button 
                onClick={handleSubmitArticle} 
                className="w-full"
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit Article"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {articles.map((article) => (
          <Card key={article.id} className="hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start p-6">
              <a 
                href={article.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1"
              >
                <CardTitle className="hover:text-primary transition-colors">
                  {article.title}
                </CardTitle>
                <CardDescription className="mt-2">
                  {new Date(article.published_at || article.created_at).toLocaleDateString()}
                  {article.verified && ' • Verified'}
                </CardDescription>
                {article.content && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                    {article.content}
                  </p>
                )}
              </a>
              {article.user_id === session?.user?.id && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteArticle(article.id)}
                  className="ml-4"
                >
                  <Trash2 className="h-4 w-4 text-destructive hover:text-destructive/90" />
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
