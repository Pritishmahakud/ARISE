import { Newspaper, ExternalLink, Clock } from "lucide-react";

function cleanText(value) {
  if (!value) return "";
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function NewsCard({ article }) {
  const source = article.source || "Unknown";
  const title = article.title || "";
  const summary = cleanText(article.summary) || "Open article for more details.";
  const url = article.url || "#";
  
  // Format date nicely
  let displayTime = "Recent";
  if (article.published_at) {
    try {
      const date = new Date(article.published_at);
      displayTime = date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      }) + " " + date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      displayTime = "Recent";
    }
  }

  return (
    <a 
      href={url}
      target="_blank"
      rel="noreferrer"
      className="glass-card rounded-xl p-4 border border-border/50 flex flex-col gap-2 group hover:border-primary/30 transition-colors"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-secondary/80 text-[10px] font-semibold text-muted-foreground border border-border">
            {source}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-[oklch(0.72_0.18_178)]" />
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="w-3 h-3" />
          {displayTime}
        </div>
      </div>
      <h3 className="text-sm font-semibold text-foreground leading-snug text-pretty line-clamp-2">
        {title}
      </h3>
      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
        {summary}
      </p>
      <div className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors mt-auto pt-1 w-fit">
        Open story <ExternalLink className="w-3 h-3" />
      </div>
    </a>
  );
}

export function NewsFeedSection({ articles }) {
  const items = articles || [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Newspaper className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold text-primary uppercase tracking-widest">Market News</span>
      </div>
      
      {items.length === 0 ? (
        <div className="w-full h-36 flex items-center justify-center text-xs text-muted-foreground bg-secondary/20 rounded-xl border border-border/40">
          No recent news articles found for this symbol.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((item, i) => <NewsCard key={i} article={item} />)}
        </div>
      )}
    </div>
  );
}
