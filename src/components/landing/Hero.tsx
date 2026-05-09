import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, QrCode, Camera, MapPin } from "lucide-react";
import heroBackground from "@/assets/hero-background.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img 
          src={heroBackground} 
          alt="" 
          className="w-full h-full object-cover"
        />
        {/* Overlay for readability - reduced opacity */}
        <div className="absolute inset-0 bg-background/70 backdrop-blur-[1px]" />
        {/* Gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background/90" />
      </div>
      
      {/* Subtle accent blurs */}
      <div className="absolute inset-0 opacity-40 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/40 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/50 border border-accent-foreground/10 mb-8 animate-fade-up">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium text-foreground">
              Seed Collection Made Simple
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 tracking-tight animate-fade-up [animation-delay:100ms]">
            Track Every Seed.
            <br />
            <span className="text-primary">Preserve Every Origin.</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-up [animation-delay:200ms]">
            The complete CRM platform for seed collectors. Scan, photograph, geolocate, 
            and create digital passports for every plant specimen in your collection.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-up [animation-delay:300ms]">
            <Link to="/login">
              <Button variant="hero" size="xl" className="w-full sm:w-auto group">
                Get Started
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap items-center justify-center gap-4 animate-fade-up [animation-delay:400ms]">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border shadow-sm">
              <QrCode className="w-4 h-4 text-primary" />
              <span className="text-sm text-foreground font-medium">QR Scanning</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border shadow-sm">
              <Camera className="w-4 h-4 text-primary" />
              <span className="text-sm text-foreground font-medium">Photo Capture</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border shadow-sm">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-sm text-foreground font-medium">Geolocation</span>
            </div>
          </div>
        </div>

        {/* Hero Image/Mockup */}
        <div className="mt-16 lg:mt-24 max-w-5xl mx-auto animate-fade-up [animation-delay:500ms]">
          {/* Demo Label */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
              ✨ Live Preview
            </span>
            <span className="text-xs text-muted-foreground">Sample data for demonstration</span>
          </div>
          
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border bg-card">
            <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent z-10 pointer-events-none" />
            <div className="aspect-[16/9] bg-gradient-to-br from-accent/30 via-card to-secondary/20 p-4 sm:p-6 lg:p-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
                {/* Seeds Table Preview */}
                <div className="lg:col-span-2 bg-background/90 backdrop-blur rounded-xl shadow-lg border border-border overflow-hidden flex flex-col">
                  {/* Table Header */}
                  <div className="px-4 py-3 border-b border-border bg-muted/30 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-foreground text-sm">Seed Collection</h3>
                      <span className="text-xs text-muted-foreground italic">Example Data</span>
                    </div>
                  </div>
                  {/* Scrolling Table Content */}
                  <div className="flex-1 overflow-hidden relative">
                    <div className="animate-scroll-up">
                      {/* Row 1 */}
                      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg">🌻</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground text-sm truncate">Helianthus annuus</div>
                          <div className="text-xs text-muted-foreground">ID: SUN-2024-0891</div>
                        </div>
                        <div className="hidden sm:block text-right">
                          <div className="text-xs text-muted-foreground">Tuscany, Italy</div>
                          <div className="text-xs text-primary">43.7696° N</div>
                        </div>
                      </div>
                      {/* Row 2 */}
                      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg">🌿</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground text-sm truncate">Lavandula angustifolia</div>
                          <div className="text-xs text-muted-foreground">ID: LAV-2024-0445</div>
                        </div>
                        <div className="hidden sm:block text-right">
                          <div className="text-xs text-muted-foreground">Provence, France</div>
                          <div className="text-xs text-primary">43.9352° N</div>
                        </div>
                      </div>
                      {/* Row 3 */}
                      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg">🌸</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground text-sm truncate">Prunus serrulata</div>
                          <div className="text-xs text-muted-foreground">ID: CHR-2024-0127</div>
                        </div>
                        <div className="hidden sm:block text-right">
                          <div className="text-xs text-muted-foreground">Kyoto, Japan</div>
                          <div className="text-xs text-primary">35.0116° N</div>
                        </div>
                      </div>
                      {/* Row 4 */}
                      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg">🌵</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground text-sm truncate">Echinopsis pachanoi</div>
                          <div className="text-xs text-muted-foreground">ID: CAC-2024-0223</div>
                        </div>
                        <div className="hidden sm:block text-right">
                          <div className="text-xs text-muted-foreground">Andes, Peru</div>
                          <div className="text-xs text-primary">-13.1631° S</div>
                        </div>
                      </div>
                      {/* Row 5 */}
                      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg">🌹</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground text-sm truncate">Rosa damascena</div>
                          <div className="text-xs text-muted-foreground">ID: ROS-2024-0567</div>
                        </div>
                        <div className="hidden sm:block text-right">
                          <div className="text-xs text-muted-foreground">Isparta, Turkey</div>
                          <div className="text-xs text-primary">37.7648° N</div>
                        </div>
                      </div>
                      {/* Row 6 */}
                      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg">🍃</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground text-sm truncate">Ginkgo biloba</div>
                          <div className="text-xs text-muted-foreground">ID: GIN-2024-0089</div>
                        </div>
                        <div className="hidden sm:block text-right">
                          <div className="text-xs text-muted-foreground">Zhejiang, China</div>
                          <div className="text-xs text-primary">29.1416° N</div>
                        </div>
                      </div>
                      {/* Row 7 */}
                      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg">🌺</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground text-sm truncate">Hibiscus rosa-sinensis</div>
                          <div className="text-xs text-muted-foreground">ID: HIB-2024-0334</div>
                        </div>
                        <div className="hidden sm:block text-right">
                          <div className="text-xs text-muted-foreground">Kerala, India</div>
                          <div className="text-xs text-primary">10.8505° N</div>
                        </div>
                      </div>
                      {/* Row 8 */}
                      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg">🌼</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground text-sm truncate">Calendula officinalis</div>
                          <div className="text-xs text-muted-foreground">ID: CAL-2024-0712</div>
                        </div>
                        <div className="hidden sm:block text-right">
                          <div className="text-xs text-muted-foreground">Andalusia, Spain</div>
                          <div className="text-xs text-primary">37.3891° N</div>
                        </div>
                      </div>
                      {/* Duplicate first rows for seamless loop */}
                      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg">🌻</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground text-sm truncate">Helianthus annuus</div>
                          <div className="text-xs text-muted-foreground">ID: SUN-2024-0891</div>
                        </div>
                        <div className="hidden sm:block text-right">
                          <div className="text-xs text-muted-foreground">Tuscany, Italy</div>
                          <div className="text-xs text-primary">43.7696° N</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg">🌿</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground text-sm truncate">Lavandula angustifolia</div>
                          <div className="text-xs text-muted-foreground">ID: LAV-2024-0445</div>
                        </div>
                        <div className="hidden sm:block text-right">
                          <div className="text-xs text-muted-foreground">Provence, France</div>
                          <div className="text-xs text-primary">43.9352° N</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg">🌸</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground text-sm truncate">Prunus serrulata</div>
                          <div className="text-xs text-muted-foreground">ID: CHR-2024-0127</div>
                        </div>
                        <div className="hidden sm:block text-right">
                          <div className="text-xs text-muted-foreground">Kyoto, Japan</div>
                          <div className="text-xs text-primary">35.0116° N</div>
                        </div>
                      </div>
                    </div>
                    {/* Fade overlays */}
                    <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-background/90 to-transparent pointer-events-none z-10" />
                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background/90 to-transparent pointer-events-none z-10" />
                  </div>
                </div>
                
                {/* Stats Cards */}
                <div className="flex lg:flex-col gap-4">
                  <div className="flex-1 bg-primary/10 rounded-xl p-4 border border-primary/20 flex flex-col justify-center">
                    <div className="text-3xl font-bold text-primary">1,234</div>
                    <div className="text-sm text-muted-foreground">Seeds Collected</div>
                  </div>
                  <div className="flex-1 bg-accent rounded-xl p-4 border border-accent-foreground/10 flex flex-col justify-center">
                    <div className="text-3xl font-bold text-accent-foreground">47</div>
                    <div className="text-sm text-muted-foreground">Species</div>
                  </div>
                  <div className="flex-1 bg-secondary rounded-xl p-4 border border-border flex flex-col justify-center">
                    <div className="text-3xl font-bold text-foreground">12</div>
                    <div className="text-sm text-muted-foreground">Countries</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
