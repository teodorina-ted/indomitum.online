import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Leaf } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "What is Indomitum?",
    a: "Indomitum is a digital platform for seed collectors and buyers. Collectors can catalog, track, and manage botanical specimens with barcodes, geolocation, and digital passports. Buyers can browse available seeds and place orders.",
  },
  {
    q: "Is Indomitum free to use?",
    a: "Yes, the core platform is free. You can create an account, manage your seed collection, generate barcodes and passports, and import/export data at no cost.",
  },
  {
    q: "What's the difference between a Collector and a Buyer?",
    a: "Collectors can add, edit, delete, and export seeds. They manage the inventory and fulfill orders. Buyers can browse the collection, view seed passports, and place orders.",
  },
  {
    q: "How do barcodes and QR codes work?",
    a: "Each seed entry gets a unique barcode. You can print these labels, attach them to physical specimens, and scan them later to instantly pull up the seed's digital passport with all its details.",
  },
  {
    q: "Can I import my existing collection?",
    a: "Absolutely. Indomitum supports CSV, JSON, and XLSX imports. Just format your data with columns like ID, Name, Quantity, City, and Country, then use the Import button on the dashboard.",
  },
  {
    q: "How does geolocation work?",
    a: "When adding a seed, the platform can capture your GPS coordinates automatically (with permission) or you can enter the address manually. This helps map where specimens were collected.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. All data is protected with row-level security policies. Collectors can only manage their own seeds, and buyers can only view seeds assigned to them. Authentication is handled via secure token-based sessions.",
  },
  {
    q: "Can I use Indomitum on mobile?",
    a: "Yes. Indomitum is a Progressive Web App (PWA), so you can install it on your phone's home screen. It also supports native builds via Capacitor for iOS and Android.",
  },
  {
    q: "How do orders work?",
    a: "Buyers submit order requests with their contact details and selected seeds. Collectors review orders, send invoices, update status, and track delivery — all within the platform.",
  },
  {
    q: "What is a Seed Passport?",
    a: "A Seed Passport is a detailed digital certificate for each seed entry. It contains the seed ID, name, collection location, date, quantity, barcode, and QR code — exportable as a PDF.",
  },
  {
    q: "How do I delete seeds?",
    a: "Select seeds from the dashboard table and click the delete button. Deleted seeds go to a recycle bin where they're kept for 90 days before permanent deletion. You can restore them anytime.",
  },
  {
    q: "Can I self-host Indomitum?",
    a: "Yes. The project includes Docker configuration with PostgreSQL, an Express API, and an Nginx frontend. Clone the repo from GitHub and run docker-compose up to deploy your own instance.",
  },
];

const FAQ = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 lg:px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Leaf className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-semibold text-foreground">FAQ</h1>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-3">Frequently Asked Questions</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Everything you need to know about using Indomitum.
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="bg-card border border-border rounded-xl px-5 data-[state=open]:border-primary/30"
            >
              <AccordionTrigger className="text-left font-medium text-foreground hover:no-underline py-4">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-sm leading-relaxed pb-4">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="text-center mt-12 space-y-3">
          <p className="text-muted-foreground text-sm">Still have questions?</p>
          <a href="mailto:info@indomitum.online">
            <Button variant="outline">Contact Support</Button>
          </a>
          <p className="text-xs text-muted-foreground">info@indomitum.online</p>
        </div>
      </div>
    </div>
  );
};

export default FAQ;
