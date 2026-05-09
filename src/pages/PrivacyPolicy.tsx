import { Link } from "react-router-dom";
import { ArrowLeft, Leaf } from "lucide-react";

const PrivacyPolicy = () => {
  const lastUpdated = "March 17, 2026";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Leaf className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">Indomitum</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: {lastUpdated}</p>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground/90">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Introduction</h2>
            <p>Indomitum ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our seed collection and tracking platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Information We Collect</h2>
            <h3 className="text-lg font-medium text-foreground">Personal Information</h3>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Name and email address when you create an account</li>
              <li>Profile information you choose to provide</li>
              <li>Communication data when you contact us</li>
            </ul>
            <h3 className="text-lg font-medium text-foreground mt-3">Usage Data</h3>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Seed collection records and metadata</li>
              <li>Geolocation data (only when you explicitly provide it)</li>
              <li>Device information, browser type, and access times</li>
              <li>Barcode scan data processed locally on your device</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>To provide, operate, and maintain the platform</li>
              <li>To manage your account and seed collections</li>
              <li>To generate Plant Passports and tracking data</li>
              <li>To communicate with you about updates and support</li>
              <li>To improve and personalize your experience</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Data Sharing</h2>
            <p className="text-muted-foreground">We do not sell your personal data. We may share information with:</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Service providers who assist in operating our platform</li>
              <li>Other users when you share seed passports via public links</li>
              <li>Legal authorities when required by law</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Data Security</h2>
            <p className="text-muted-foreground">We use industry-standard security measures including encryption in transit (TLS) and at rest, row-level security policies, and secure authentication. However, no method of transmission over the internet is 100% secure.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Data Retention</h2>
            <p className="text-muted-foreground">We retain your data for as long as your account is active or as needed to provide services. Deleted seeds are moved to a recycle bin and permanently removed after 30 days.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. Your Rights</h2>
            <p className="text-muted-foreground">Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Access and receive a copy of your personal data</li>
              <li>Rectify inaccurate personal data</li>
              <li>Request deletion of your personal data</li>
              <li>Object to or restrict processing of your data</li>
              <li>Data portability (export your data)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">8. Children's Privacy</h2>
            <p className="text-muted-foreground">Our platform is not intended for children under 16. We do not knowingly collect personal data from children.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">9. Changes to This Policy</h2>
            <p className="text-muted-foreground">We may update this Privacy Policy from time to time. We will notify you of material changes by posting the new policy on this page with an updated date.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">10. Contact Us</h2>
            <p className="text-muted-foreground">If you have questions about this Privacy Policy, please contact us through the support form on our website.</p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
