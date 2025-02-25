
import { useState, useEffect } from 'react';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { Database } from '@/lib/database.types';
import { useToast } from "@/hooks/use-toast";

type Article = Database['public']['Tables']['articles']['Row'];

export const useArticles = () => {
  const session = useSession();
  const supabase = useSupabaseClient<Database>();
  const { toast } = useToast();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

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

  const deleteArticle = async (articleId: string) => {
    if (!session?.user?.id) return;

    try {
      const { error } = await supabase
        .from('articles')
        .delete()
        .eq('id', articleId)
        .eq('user_id', session.user.id);

      if (error) throw error;

      setArticles(articles.filter(article => article.id !== articleId));

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

  useEffect(() => {
    if (session?.user?.id) {
      fetchArticles();
    }
  }, [session?.user?.id]);

  return {
    articles,
    loading,
    deleteArticle,
    fetchArticles,
  };
};
