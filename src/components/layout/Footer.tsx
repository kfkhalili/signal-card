"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Github,
  Twitter,
  Linkedin,
  TrendingUp,
  BarChart3,
  Users,
  Shield,
  Zap,
} from "lucide-react";

const currentYear = new Date().getFullYear();

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="container mx-auto px-4 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">Tickered</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">
              Transform complex financial data into interactive, digestible
              experiences. Spot trends, see moves, and build your unique
              collection of market insights.
            </p>
            <div className="flex space-x-3">
              <Button variant="ghost" size="sm" asChild>
                <Link
                  href="https://twitter.com/tickered"
                  target="_blank"
                  rel="noopener noreferrer">
                  <Twitter className="h-4 w-4" />
                  <span className="sr-only">Twitter</span>
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link
                  href="https://github.com/tickered"
                  target="_blank"
                  rel="noopener noreferrer">
                  <Github className="h-4 w-4" />
                  <span className="sr-only">GitHub</span>
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link
                  href="https://linkedin.com/company/tickered"
                  target="_blank"
                  rel="noopener noreferrer">
                  <Linkedin className="h-4 w-4" />
                  <span className="sr-only">LinkedIn</span>
                </Link>
              </Button>
            </div>
          </div>

          {/* Product */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Product</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/about"
                  className="text-muted-foreground hover:text-foreground transition-colors">
                  About Tickered
                </Link>
              </li>
              <li>
                <Link
                  href="/features"
                  className="text-muted-foreground hover:text-foreground transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="text-muted-foreground hover:text-foreground transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="/workspace"
                  className="text-muted-foreground hover:text-foreground transition-colors">
                  Workspace
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/blog"
                  className="text-muted-foreground hover:text-foreground transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  href="/help"
                  className="text-muted-foreground hover:text-foreground transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link
                  href="/api"
                  className="text-muted-foreground hover:text-foreground transition-colors">
                  API Documentation
                </Link>
              </li>
              <li>
                <Link
                  href="/status"
                  className="text-muted-foreground hover:text-foreground transition-colors">
                  System Status
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Company</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/about"
                  className="text-muted-foreground hover:text-foreground transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/careers"
                  className="text-muted-foreground hover:text-foreground transition-colors">
                  Careers
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-muted-foreground hover:text-foreground transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  href="/press"
                  className="text-muted-foreground hover:text-foreground transition-colors">
                  Press Kit
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Features Highlight */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 p-6 bg-muted/30 rounded-lg">
          <div className="flex items-start space-x-3">
            <BarChart3 className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-medium text-sm">Real-time Data</h4>
              <p className="text-xs text-muted-foreground">
                Live market data and financial information
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <Users className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-medium text-sm">Dual Audience</h4>
              <p className="text-xs text-muted-foreground">
                Simplified for beginners, powerful for professionals
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-medium text-sm">Secure & Reliable</h4>
              <p className="text-xs text-muted-foreground">
                Enterprise-grade security and uptime
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-border pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-6 text-sm text-muted-foreground">
              <span>&copy; {currentYear} Tickered. All rights reserved.</span>
              <div className="flex items-center space-x-4">
                <Link
                  href="/privacy"
                  className="hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
                <Link
                  href="/terms"
                  className="hover:text-foreground transition-colors">
                  Terms of Service
                </Link>
                <Link
                  href="/cookies"
                  className="hover:text-foreground transition-colors">
                  Cookie Policy
                </Link>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="text-xs">
                <Zap className="h-3 w-3 mr-1" />
                Powered by Supabase
              </Badge>
              <Badge variant="outline" className="text-xs">
                Next.js 15
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
