import Link from "next/link";
import { ArrowRight } from "lucide-react";

const placeholderPosts = [
  {
    id: 1,
    title: "Understanding P/E Ratios: A Beginner&apos;s Guide",
    excerpt:
      "The Price-to-Earnings ratio is a fundamental metric for stock valuation. In this post, we break down what it means and how to use it.",
    category: "Investing 101",
    date: "June 15, 2025",
  },
  {
    id: 2,
    title: "How Real-Time Data is Changing the Game for Retail Investors",
    excerpt:
      "The information gap between professional and retail investors is shrinking. Discover the impact of having real-time data at your fingertips.",
    category: "Market Trends",
    date: "June 10, 2025",
  },
  {
    id: 3,
    title: "Welcome to Tickered: A New Way to See the Market",
    excerpt:
      "Learn about the vision behind Tickered and how our interactive card-based system is designed to make financial analysis more intuitive.",
    category: "Product Updates",
    date: "June 1, 2025",
  },
];

export default function BlogPage() {
  return (
    <div className="bg-background text-foreground">
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            The Tickered Blog
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
            Insights on investing, market trends, and product updates from the
            Tickered team.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {placeholderPosts.map((post) => (
            <Link href="#" key={post.id} className="block group">
              <div className="bg-card p-6 rounded-lg border h-full flex flex-col">
                <p className="text-sm text-primary font-semibold">
                  {post.category}
                </p>
                <h3 className="text-xl font-semibold my-2 flex-grow">
                  {post.title}
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {post.excerpt}
                </p>
                <div className="flex justify-between items-center mt-auto text-sm">
                  <span className="text-muted-foreground">{post.date}</span>
                  <span className="flex items-center text-primary font-medium group-hover:translate-x-1 transition-transform">
                    Read More <ArrowRight className="h-4 w-4 ml-1" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-16">
          <h2 className="text-2xl font-bold">More Content Coming Soon</h2>
          <p className="text-muted-foreground mt-2">
            Our blog is just getting started. Check back soon for more articles.
          </p>
        </div>
      </main>
    </div>
  );
}
