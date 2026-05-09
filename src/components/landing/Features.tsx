import { 
  QrCode, 
  Camera, 
  MapPin, 
  FileText, 
  History, 
  Trash2,
  Search,
  Download,
  Shield
} from "lucide-react";

const features = [
  {
    icon: QrCode,
    title: "Smart QR Scanning",
    description: "Instantly scan bag codes to auto-populate seed IDs. Each bag gets a unique digital identity."
  },
  {
    icon: Camera,
    title: "Photo Documentation",
    description: "Capture plant images directly from your device camera or upload from your gallery."
  },
  {
    icon: MapPin,
    title: "Precise Geolocation",
    description: "Automatically record GPS coordinates with full address details for every collection."
  },
  {
    icon: FileText,
    title: "Digital Passports",
    description: "Generate professional PDF certificates with complete seed provenance and details."
  },
  {
    icon: Search,
    title: "Powerful Search",
    description: "Find any seed instantly with advanced filtering, sorting, and full-text search."
  },
  {
    icon: Download,
    title: "Easy Export",
    description: "Export your data in multiple formats. Share collections with stakeholders effortlessly."
  },
  {
    icon: History,
    title: "Complete History",
    description: "Track every modification with a comprehensive audit trail. Nothing is ever lost."
  },
  {
    icon: Trash2,
    title: "Safe Deletion",
    description: "Deleted items go to a recovery bin. Restore accidentally deleted records up to 90 days."
  },
  {
    icon: Shield,
    title: "Role-Based Access",
    description: "Admins, collectors, and buyers each get tailored access to the features they need."
  }
];

const Features = () => {
  return (
    <section id="features" className="py-24 lg:py-32 bg-card">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-2xl mx-auto text-center mb-16">
          <span className="text-sm font-semibold text-primary uppercase tracking-wider">
            Features
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
            Everything You Need to Manage Seeds
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            A complete toolkit designed for professional seed collectors and conservation teams.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group relative p-6 lg:p-8 rounded-2xl bg-background border border-border hover:border-primary/20 hover:shadow-elegant transition-all duration-300"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              
              {/* Content */}
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>

              {/* Hover Effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
