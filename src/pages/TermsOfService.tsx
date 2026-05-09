import { Link } from "react-router-dom";
import { ArrowLeft, Leaf } from "lucide-react";

const TermsOfService = () => {
  const lastUpdated = "March 17, 2026";

  return (
    <div className="min-h-screen bg-background">
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
        <h1 className="text-3xl font-bold text-foreground mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: {lastUpdated}</p>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground/90">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">By accessing or using Indomitum, you agree to be bound by these Terms of Service. If you do not agree, you may not use the platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Description of Service</h2>
            <p className="text-muted-foreground">Indomitum is a seed collection and tracking platform that allows users to catalog, manage, and share botanical collections. Features include seed inventory management, barcode generation, Plant Passports, geolocation tracking, and order management.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. User Accounts</h2>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>You must provide accurate and complete registration information</li>
              <li>You are responsible for maintaining the security of your account</li>
              <li>You must notify us immediately of any unauthorized access</li>
              <li>One person or entity may not maintain more than one account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. User Roles</h2>
            <p className="text-muted-foreground">The platform supports different roles including Collectors (who manage seed inventories), Buyers (who receive and track seeds), and Administrators. Each role has specific permissions and responsibilities within the platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Acceptable Use</h2>
            <p className="text-muted-foreground">You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Use the platform for any unlawful purpose</li>
              <li>Upload false or misleading seed data</li>
              <li>Attempt to gain unauthorized access to other users' data</li>
              <li>Interfere with or disrupt the platform's infrastructure</li>
              <li>Use the platform to trade protected or endangered species in violation of applicable laws</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Intellectual Property</h2>
            <p className="text-muted-foreground">The Indomitum platform, including its design, code, and branding, is our intellectual property. You retain ownership of any seed data, photos, and content you upload to the platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. Data and Content</h2>
            <p className="text-muted-foreground">You are responsible for the accuracy of the data you enter. By creating public Plant Passports, you grant us a license to display that information to users who access the passport link.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">8. Limitation of Liability</h2>
            <p className="text-muted-foreground">Indomitum is provided "as is" without warranties of any kind. We shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">9. Termination</h2>
            <p className="text-muted-foreground">We reserve the right to suspend or terminate your account at any time for violations of these terms. You may delete your account at any time through your account settings.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">10. Changes to Terms</h2>
            <p className="text-muted-foreground">We may modify these terms at any time. Continued use of the platform after changes constitutes acceptance of the revised terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">11. Governing Law</h2>
            <p className="text-muted-foreground">These terms shall be governed by and construed in accordance with applicable laws. Any disputes shall be resolved in the courts of the jurisdiction where Indomitum operates.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">12. Contact</h2>
            <p className="text-muted-foreground">For questions about these Terms of Service, please contact us through the support form on our website.</p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default TermsOfService;
