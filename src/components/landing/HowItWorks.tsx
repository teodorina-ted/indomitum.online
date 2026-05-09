const steps = [
  {
    number: "01",
    title: "Scan the Bag",
    description: "Point your camera at the QR code on the seed bag. The unique ID is captured instantly.",
    visual: "📱"
  },
  {
    number: "02",
    title: "Photograph the Plant",
    description: "Take a clear photo of the parent plant or seed specimen for visual documentation.",
    visual: "📸"
  },
  {
    number: "03",
    title: "Capture Location",
    description: "GPS coordinates and address are recorded automatically. Add notes if needed.",
    visual: "📍"
  },
  {
    number: "04",
    title: "Submit & Share",
    description: "Your seed data is saved to the dashboard. Generate digital passports to share with buyers.",
    visual: "✅"
  }
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-24 lg:py-32 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-2xl mx-auto text-center mb-16">
          <span className="text-sm font-semibold text-primary uppercase tracking-wider">
            How It Works
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
            Four Simple Steps
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            From field to database in under a minute. Here's the collector workflow.
          </p>
        </div>

        {/* Steps */}
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            {/* Connection Line */}
            <div className="absolute left-8 top-0 bottom-0 w-px bg-border hidden lg:block" />
            
            <div className="space-y-12">
              {steps.map((step, index) => (
                <div
                  key={step.number}
                  className="relative flex flex-col lg:flex-row gap-6 lg:gap-12 items-start"
                >
                  {/* Step Number */}
                  <div className="relative z-10 flex-shrink-0">
                    <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
                      <span className="text-2xl">{step.visual}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-8 lg:pb-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-bold text-primary uppercase tracking-wider">
                        Step {step.number}
                      </span>
                    </div>
                    <h3 className="text-xl lg:text-2xl font-semibold text-foreground mb-2">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground text-lg">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
