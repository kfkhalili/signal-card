import type { Metadata } from "next";
import { Mail, MessageSquare, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const metadata: Metadata = {
  title: "Contact Us - Tickered Financial Data Platform",
  description:
    "Get in touch with Tickered for support, partnerships, or general inquiries. Contact our team for enterprise financial data API access, integration support, and institutional-grade market data services.",
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: "Contact Us - Tickered Financial Data Platform",
    description:
      "Get in touch with Tickered for support, partnerships, or general inquiries about our financial data API and market analytics platform.",
    type: "website",
    url: "/contact",
  },
  twitter: {
    card: "summary",
    title: "Contact Us - Tickered",
    description:
      "Get in touch with Tickered for support, partnerships, or general inquiries about our financial data API and market analytics platform.",
  },
};

export default function ContactPage() {
  return (
    <div className="bg-background text-foreground">
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Contact Us
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
            Have a question, feedback, or a partnership inquiry? We&apos;d love
            to hear from you.
          </p>
        </div>

        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div className="bg-card p-8 rounded-lg border">
            <h2 className="text-2xl font-semibold mb-6">Send a Message</h2>
            <form className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="Your Name" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="your@email.com" />
              </div>
              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" placeholder="How can we help?" />
              </div>
              <Button type="submit" className="w-full">
                Submit
              </Button>
            </form>
          </div>

          {/* Contact Info */}
          <div className="space-y-8">
            <div className="flex items-start space-x-4">
              <Mail className="h-6 w-6 text-primary mt-1" />
              <div>
                <h3 className="font-semibold text-lg">Email</h3>
                <p className="text-muted-foreground">
                  General Inquiries:{" "}
                  <a
                    href="mailto:hello@tickered.com"
                    className="text-primary hover:underline">
                    hello@tickered.com
                  </a>
                </p>
                <p className="text-muted-foreground">
                  Support:{" "}
                  <a
                    href="mailto:support@tickered.com"
                    className="text-primary hover:underline">
                    support@tickered.com
                  </a>
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <MessageSquare className="h-6 w-6 text-primary mt-1" />
              <div>
                <h3 className="font-semibold text-lg">Social Media</h3>
                <p className="text-muted-foreground">
                  Connect with us on{" "}
                  <a
                    href="https://twitter.com/tickered"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline">
                    Twitter
                  </a>{" "}
                  and{" "}
                  <a
                    href="https://linkedin.com/company/tickered"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline">
                    LinkedIn
                  </a>
                  .
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <Building className="h-6 w-6 text-primary mt-1" />
              <div>
                <h3 className="font-semibold text-lg">Mailing Address</h3>
                <p className="text-muted-foreground">
                  Tickered
                  <br />
                  Germany
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
