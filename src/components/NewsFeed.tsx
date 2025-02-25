
import React from 'react';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { Database } from '@/lib/database.types';
import { useToast } from "@/hooks/use-toast";
import { ArticleCard } from './news-feed/ArticleCard';
import { SubmitArticleDialog } from './news-feed/SubmitArticleDialog';
import { useArticles } from './news-feed/useArticles';

export const NewsFeed = () => {
  const session = useSession();
  const supabase = useSupabaseClient<Database>();
  const { toast } = useToast();
  const [submitting, setSubmitting] = React.useState(false);
  const [articleUrl, setArticleUrl] = React.useState('');
  const { articles, loading, deleteArticle, fetchArticles } = useArticles();

  const handleSubmitArticle = async () => {
    if (!session?.user?.id || !articleUrl) return;

    setSubmitting(true);

    try {
      const urlObject = new URL(articleUrl);
      const pathSegments = urlObject.pathname.split('/').filter(Boolean);
      const lastSegment = pathSegments[pathSegments.length - 1] || urlObject.hostname;
      const basicTitle = lastSegment
        .replace(/[-_]/g, ' ')
        .replace(/\.\w+$/, '')
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
      await fetchArticles();
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

  if (loading) {
    return <div>Loading articles...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">News Feed</h3>
        <SubmitArticleDialog
          articleUrl={articleUrl}
          onArticleUrlChange={setArticleUrl}
          onSubmit={handleSubmitArticle}
          submitting={submitting}
        />
      </div>

      <div className="grid gap-4">
        {articles.map((article) => (
          <ArticleCard
            key={article.id}
            article={article}
            onDelete={deleteArticle}
          />
        ))}
      </div>
    </div>
  );
};
