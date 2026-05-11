import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Leaf, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const API_URL = import.meta.env.VITE_API_URL || "";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) { setStatus("error"); return; }

    fetch(`${API_URL}/auth/verify-email?token=${token}`)
      .then((r) => r.json())
      .then((data) => setStatus(data.error ? "error" : "success"))
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center">
            <Leaf className="w-8 h-8 text-primary-foreground" />
          </div>
        </div>

        {status === "loading" && (
          <div className="space-y-3">
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Verifying...</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold text-foreground">You're verified!</h2>
            <p className="text-muted-foreground">Your account is ready. You can now sign in.</p>
            <Button className="w-full" size="lg" onClick={() => navigate("/login")}>
              Continue to App →
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <XCircle className="w-16 h-16 text-destructive mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Link expired</h2>
            <p className="text-muted-foreground">This link is invalid or has expired. Request a new one from the login page.</p>
            <Button variant="outline" className="w-full" onClick={() => navigate("/login")}>
              Back to Login
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
