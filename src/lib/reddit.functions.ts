import { createServerFn } from "@tanstack/react-start";

export type LiveRedditPost = {
  id: string;
  iso: string;
  time: string;
  subreddit: string;
  author: string;
  title: string;
  body: string;
  url: string;
  score: number;
  comments: number;
};

type RedditSearchResponse = {
  data?: {
    children?: Array<{
      data?: {
        id?: string;
        created_utc?: number;
        subreddit?: string;
        author?: string;
        title?: string;
        selftext?: string;
        permalink?: string;
        score?: number;
        num_comments?: number;
      };
    }>;
  };
};

function fmtTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

function cleanText(s: string) {
  return s.replace(/\s+/g, " ").replace(/https?:\/\/\S+/gi, "").trim();
}

export const getLiveHantaReddit = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ items: LiveRedditPost[]; fetchedAt: string }> => {
    const fetchedAt = new Date().toISOString();
    const params = new URLSearchParams({
      q: "hantavirus OR \"andes virus\" OR hfrs OR hcps",
      sort: "new",
      t: "week",
      limit: "12",
    });

    const res = await fetch(`https://www.reddit.com/search.json?${params.toString()}`, {
      headers: { "User-Agent": "HantaER/1.0" },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      throw new Error(`Reddit API error ${res.status}`);
    }

    const data = (await res.json()) as RedditSearchResponse;
    const items: LiveRedditPost[] = (data.data?.children ?? [])
      .map((child) => child.data)
      .filter((post): post is NonNullable<typeof post> => Boolean(post?.id && post?.title))
      .map((post) => {
        const iso = new Date((post.created_utc ?? Date.now() / 1000) * 1000).toISOString();
        return {
          id: post.id ?? "",
          iso,
          time: fmtTime(iso),
          subreddit: post.subreddit ?? "unknown",
          author: post.author ?? "unknown",
          title: cleanText(post.title ?? ""),
          body: cleanText(post.selftext ?? "").slice(0, 240),
          url: `https://www.reddit.com${post.permalink ?? ""}`,
          score: post.score ?? 0,
          comments: post.num_comments ?? 0,
        };
      })
      .filter((p) => p.title.length > 0);

    return { items, fetchedAt };
  },
);
