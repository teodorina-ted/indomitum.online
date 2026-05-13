import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Rocket } from "lucide-react";

interface ComingSoonProps {
  title: string;
  description: string;
  backTo?: string;
}

const ComingSoon = ({ title, description, backTo = "/buyer" }: ComingSoonProps) => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(backTo)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center space-y-5 max-w-sm">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Rocket className="w-10 h-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Coming in v2.1</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
          </div>
          <Button variant="outline" onClick={() => navigate(backTo)} className="w-full">
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ComingSoon;
