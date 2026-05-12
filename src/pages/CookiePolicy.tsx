import { Link } from "react-router-dom";
import { ArrowLeft, Leaf } from "lucide-react";

const CookiePolicy = () => {
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
        <h1 className="text-3xl font-bold text-foreground mb-2">Cookie Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: {lastUpdated}</p>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground/90">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. What Are Cookies</h2>
            <p className="text-muted-foreground">Cookies are small text files stored on your device when you visit a website. They help the website remember your preferences and improve your experience.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. How We Use Cookies</h2>
            <p className="text-muted-foreground">Indomitum uses cookies and similar technologies for the following purposes:</p>

            <h3 className="text-lg font-medium text-foreground mt-3">Essential Cookies</h3>
            <p className="text-muted-foreground">These are required for the platform to function properly:</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong>Authentication tokens</strong> — to keep you signed in securely</li>
              <li><strong>Session management</strong> — to maintain your active session</li>
              <li><strong>Security tokens</strong> — to prevent cross-site request forgery</li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mt-3">Functional Cookies</h3>
            <p className="text-muted-foreground">These remember your preferences:</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong>Theme preference</strong> — light or dark mode setting</li>
              <li><strong>Onboarding state</strong> — whether you've completed the guided tour</li>
              <li><strong>UI preferences</strong> — sidebar state, table column widths</li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mt-3">Local Storage</h3>
            <p className="text-muted-foreground">We also use browser local storage (similar to cookies) for:</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Persisting your authentication session</li>
              <li>Caching user preferences for faster loading</li>
              <li>Storing PWA offline data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. Third-Party Cookies</h2>
            <p className="text-muted-foreground">We do not use third-party advertising or tracking cookies. Our platform relies solely on essential and functional cookies necessary for operation.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Managing Cookies</h2>
            <p className="text-muted-foreground">You can control cookies through your browser settings. Note that disabling essential cookies may prevent you from using certain features of the platform, such as signing in.</p>
            <p className="text-muted-foreground">Most browsers allow you to:</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>View and delete existing cookies</li>
              <li>Block all or specific cookies</li>
              <li>Set preferences for certain websites</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Updates to This Policy</h2>
            <p className="text-muted-foreground">We may update this Cookie Policy to reflect changes in our practices or for operational, legal, or regulatory reasons. The updated date at the top of this page indicates the latest revision.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Contact</h2>
            <p className="text-muted-foreground">If you have questions about our use of cookies, please contact us at <a href="mailto:info@indomitum.online" className="text-primary underline">info@indomitum.online</a>.</p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default CookiePolicy;
