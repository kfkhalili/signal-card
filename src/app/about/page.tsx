import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  TrendingUp,
  BarChart3,
  Users,
  Shield,
  Zap,
  Globe,
  Target,
  Lightbulb,
  ArrowRight,
  CheckCircle,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About Tickered - Financial Data Visualization & Analysis Platform",
  description:
    "Learn about Tickered, the innovative financial data visualization platform that transforms complex market data into interactive, digestible experiences for both beginner and professional investors.",
  keywords: [
    "Tickered about",
    "financial data visualization",
    "investment analysis platform",
    "stock market data",
    "financial technology",
    "investment tools",
    "market analysis software",
    "financial education platform",
  ],
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About Tickered - Financial Data Visualization & Analysis Platform",
    description:
      "Learn about Tickered, the innovative financial data visualization platform that transforms complex market data into interactive, digestible experiences.",
    type: "website",
    url: "/about",
  },
  twitter: {
    card: "summary_large_image",
    title: "About Tickered - Financial Data Visualization & Analysis Platform",
    description:
      "Learn about Tickered, the innovative financial data visualization platform that transforms complex market data into interactive, digestible experiences.",
  },
};

const AboutPage = () => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Tickered",
    url: process.env.NEXT_PUBLIC_BASE_URL || "https://www.tickered.com",
    logo: `${
      process.env.NEXT_PUBLIC_BASE_URL || "https://www.tickered.com"
    }/images/tickered.png`,
    description:
      "Tickered is a financial data visualization and analysis platform that transforms complex market data into interactive, digestible experiences.",
    foundingDate: "2024",
    industry: "Financial Technology",
    numberOfEmployees: "1-10",
    address: {
      "@type": "PostalAddress",
      addressCountry: "DE",
    },
    sameAs: [
      "https://twitter.com/tickered",
      "https://github.com/tickered",
      "https://linkedin.com/company/tickered",
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <TrendingUp className="h-12 w-12 text-primary mr-3" />
            <h1 className="text-4xl md:text-5xl font-bold">About Tickered</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            We&apos;re revolutionizing how people interact with financial data
            by making complex market information accessible, interactive, and
            engaging through our innovative card-based system.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Badge variant="secondary" className="text-sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              Real-time Data
            </Badge>
            <Badge variant="secondary" className="text-sm">
              <Users className="h-4 w-4 mr-2" />
              Dual Audience
            </Badge>
            <Badge variant="secondary" className="text-sm">
              <Shield className="h-4 w-4 mr-2" />
              Enterprise Security
            </Badge>
            <Badge variant="secondary" className="text-sm">
              <Zap className="h-4 w-4 mr-2" />
              Modern Tech Stack
            </Badge>
          </div>
        </div>

        {/* Mission & Vision */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2 text-primary" />
                Our Mission
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                To democratize financial data access by transforming complex
                market information into intuitive, interactive experiences that
                empower both beginner and professional investors to make
                informed decisions.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lightbulb className="h-5 w-5 mr-2 text-primary" />
                Our Vision
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                To become the leading platform for financial data visualization,
                where anyone can explore, understand, and act on market
                information through engaging, educational, and powerful tools.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Problem & Solution */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">
            The Problem We Solve
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-destructive/20">
              <CardHeader>
                <CardTitle className="text-destructive">
                  The Challenge
                </CardTitle>
                <CardDescription>
                  Traditional financial platforms overwhelm users
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-destructive mt-0.5" />
                  <p className="text-sm">
                    Vast amounts of non-contextualized data
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-destructive mt-0.5" />
                  <p className="text-sm">Steep learning curve for beginners</p>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-destructive mt-0.5" />
                  <p className="text-sm">Boring and inaccessible interfaces</p>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-destructive mt-0.5" />
                  <p className="text-sm">Lack of intuitive exploration tools</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-primary">Our Solution</CardTitle>
                <CardDescription>
                  Interactive & social financial cards
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                  <p className="text-sm">
                    Modular card system for personalized dashboards
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                  <p className="text-sm">
                    Deep interactivity with clickable metrics
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                  <p className="text-sm">Sleek, user-centric design</p>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                  <p className="text-sm">Real-time data updates</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Target Audience */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Who We Serve</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2 text-primary" />
                  Beginner Investors
                </CardTitle>
                <CardDescription>
                  Individuals learning about investing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Simplified card format for easy understanding</li>
                  <li>• Educational content and guided exploration</li>
                  <li>• Community insights and learning paths</li>
                  <li>• Risk-free environment to explore market data</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-primary" />
                  Professional Investors
                </CardTitle>
                <CardDescription>
                  Experienced traders and analysts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Advanced analytics and sophisticated dashboards</li>
                  <li>• Custom cards and personalized workspaces</li>
                  <li>• Shareable dashboards and collections</li>
                  <li>• Powerful tools for in-depth analysis</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Technology Stack */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">
            Built with Modern Technology
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Frontend</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Next.js 15</span>
                  <Badge variant="outline" className="text-xs">
                    Framework
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">React 19</span>
                  <Badge variant="outline" className="text-xs">
                    UI Library
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">TypeScript</span>
                  <Badge variant="outline" className="text-xs">
                    Language
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Tailwind CSS</span>
                  <Badge variant="outline" className="text-xs">
                    Styling
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Backend</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Supabase</span>
                  <Badge variant="outline" className="text-xs">
                    Database
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">PostgreSQL</span>
                  <Badge variant="outline" className="text-xs">
                    SQL Database
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Edge Functions</span>
                  <Badge variant="outline" className="text-xs">
                    Serverless
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Real-time</span>
                  <Badge variant="outline" className="text-xs">
                    Live Updates
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Data & APIs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">FinancialModelingPrep</span>
                  <Badge variant="outline" className="text-xs">
                    Market Data
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Recharts</span>
                  <Badge variant="outline" className="text-xs">
                    Charts
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Leaflet</span>
                  <Badge variant="outline" className="text-xs">
                    Maps
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">pg_cron</span>
                  <Badge variant="outline" className="text-xs">
                    Scheduling
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-muted/30 rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-4">
            Ready to Transform Your Financial Analysis?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Join thousands of investors who are already using Tickered to
            explore market data in a whole new way. Start building your
            personalized dashboard today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/auth#auth-sign-up">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/workspace">
                Explore Workspace
                <Globe className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AboutPage;
