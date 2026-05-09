import { Leaf, MapPin, Package, Calendar, User } from "lucide-react";

interface DemoSeed {
  id: string;
  name: string;
  city: string;
  country: string;
  quantity: number;
  date: string;
  addedBy: string;
}

const demoSeeds: DemoSeed[] = [
  { id: "SEED-A1B2C3", name: "Quercus Robur", city: "Berlin", country: "Germany", quantity: 150, date: "2024-01-15", addedBy: "J. Schmidt" },
  { id: "SEED-D4E5F6", name: "Pinus Sylvestris", city: "Stockholm", country: "Sweden", quantity: 200, date: "2024-01-18", addedBy: "A. Lindgren" },
  { id: "SEED-G7H8I9", name: "Fagus Sylvatica", city: "Vienna", country: "Austria", quantity: 75, date: "2024-01-20", addedBy: "M. Weber" },
  { id: "SEED-J1K2L3", name: "Acer Platanoides", city: "Prague", country: "Czechia", quantity: 300, date: "2024-01-22", addedBy: "K. Novak" },
];

export function DemoPreview() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-b from-primary/5 to-transparent mb-6">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background z-10 pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />
      
      <div className="px-4 py-2 border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span>Live Data Preview</span>
        </div>
      </div>

      <div className="h-24 overflow-hidden relative">
        <div className="animate-scroll-up">
          {/* Double the items for seamless loop */}
          {[...demoSeeds, ...demoSeeds].map((seed, idx) => (
            <div
              key={`${seed.id}-${idx}`}
              className="flex items-center gap-3 px-4 py-2 border-b border-border/30 hover:bg-muted/20 transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Leaf className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground text-sm truncate">{seed.name}</span>
                  <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{seed.id}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {seed.city}
                  </span>
                  <span className="flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    {seed.quantity}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(seed.date).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1 hidden sm:flex">
                    <User className="w-3 h-3" />
                    {seed.addedBy}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}