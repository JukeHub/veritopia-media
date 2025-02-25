
import React from 'react';
import { useSession } from '@supabase/auth-helpers-react';
import { Database } from '@/lib/database.types';
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import {
  Card,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";

type Article = Database['public']['Tables']['articles']['Row'];

interface ArticleCardProps {
  article: Article;
  onDelete: (articleId: string) => void;
}

export const ArticleCard = ({ article, onDelete }: ArticleCardProps) => {
  const session = useSession();

  return (
    <Card className="hover:shadow-lg transition-shadow">
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
            onClick={() => onDelete(article.id)}
            className="ml-4"
          >
            <Trash2 className="h-4 w-4 text-destructive hover:text-destructive/90" />
          </Button>
        )}
      </div>
    </Card>
  );
};
