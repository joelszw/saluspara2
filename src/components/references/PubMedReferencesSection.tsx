import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, ExternalLink, BookOpen, Calendar, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PubMedArticle {
  id: string;
  title: string;
  authors: string;
  abstract: string;
  doi: string;
  url: string;
  year: string;
  journal: string;
  pmid: string;
}

interface PubMedReferencesSectionProps {
  articles: PubMedArticle[];
  keywords?: string[];
  translatedQuery?: string;
}

export const PubMedReferencesSection: React.FC<PubMedReferencesSectionProps> = ({
  articles,
  keywords = [],
  translatedQuery
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { t } = useTranslation();

  if (!articles || articles.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="mt-6 bg-gradient-to-br from-card/50 to-card/80 backdrop-blur-sm border border-border/50 rounded-lg p-4"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-secondary rounded-lg">
            <BookOpen className="h-5 w-5 text-secondary-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {t("pubmed.title")}
            </h3>
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {keywords.map((keyword, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {keyword}
                  </Badge>
                ))}
              </div>
            )}
            {translatedQuery && (
              <p className="text-xs text-muted-foreground mt-1">
                {t("pubmed.translated_query")}: {translatedQuery}
              </p>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-muted-foreground hover:text-foreground"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-1" />
              {t("pubmed.collapse")}
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-1" />
              {t("pubmed.expand", { count: articles.length })}
            </>
          )}
        </Button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-3"
          >
            {articles.map((article, index) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="hover:shadow-soft transition-all duration-200">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-4">
                        <h4 className="font-semibold text-sm text-foreground line-clamp-2 leading-relaxed">
                          {article.title}
                        </h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0 h-8 w-8 p-0"
                          onClick={() => window.open(article.url, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span className="truncate max-w-[200px]">{article.authors}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{article.year}</span>
                        </div>
                        <div className="text-xs">
                          <span className="font-mono">PMID: {article.pmid}</span>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {article.abstract}
                      </p>

                      <div className="text-xs text-muted-foreground truncate">
                        <strong>{article.journal}</strong>
                        {article.doi && (
                          <span className="ml-2">
                            DOI: <span className="font-mono">{article.doi}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: articles.length * 0.1 + 0.2 }}
              className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-md border-l-4 border-info"
            >
              <p className="font-medium mb-1">{t("pubmed.disclaimer.title")}</p>
              <p>{t("pubmed.disclaimer.text")}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};