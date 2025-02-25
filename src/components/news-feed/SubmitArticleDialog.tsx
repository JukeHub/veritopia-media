
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface SubmitArticleDialogProps {
  articleUrl: string;
  onArticleUrlChange: (url: string) => void;
  onSubmit: () => void;
  submitting: boolean;
}

export const SubmitArticleDialog = ({
  articleUrl,
  onArticleUrlChange,
  onSubmit,
  submitting,
}: SubmitArticleDialogProps) => {
  return (
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
              onChange={(e) => onArticleUrlChange(e.target.value)}
              type="url"
            />
          </div>
          <Button 
            onClick={onSubmit} 
            className="w-full"
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit Article"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
