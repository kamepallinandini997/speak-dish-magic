import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Fingerprint, Lock, X } from "lucide-react";

interface PaymentAuthProps {
  open: boolean;
  onAuthenticate: (method: "pin" | "biometric", pin?: string) => Promise<boolean>;
  onCancel: () => void;
  orderTotal?: number;
}

export const PaymentAuth = ({
  open,
  onAuthenticate,
  onCancel,
  orderTotal,
}: PaymentAuthProps) => {
  const [pin, setPin] = useState("");
  const [method, setMethod] = useState<"pin" | "biometric" | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState("");

  const handleBiometric = async () => {
    setIsAuthenticating(true);
    setError("");

    try {
      // Check if WebAuthn is available
      if ("credentials" in navigator && "PublicKeyCredential" in window) {
        // Try WebAuthn authentication
        const credential = await (navigator.credentials as any).get({
          publicKey: {
            challenge: new Uint8Array(32),
            allowCredentials: [],
            userVerification: "required",
            timeout: 60000,
          },
        });

        if (credential) {
          const success = await onAuthenticate("biometric");
          if (success) {
            reset();
          } else {
            setError("Biometric authentication failed. Please try PIN instead.");
            setMethod("pin");
          }
        }
      } else {
        // Fallback: Show PIN option
        setMethod("pin");
      }
    } catch (error: any) {
      console.error("Biometric auth error:", error);
      // User cancelled or not available, show PIN option
      if (error.name !== "NotAllowedError") {
        setError("Biometric authentication not available. Please use PIN.");
      }
      setMethod("pin");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handlePIN = async () => {
    if (pin.length < 4) {
      setError("PIN must be at least 4 digits");
      return;
    }

    setIsAuthenticating(true);
    setError("");

    try {
      const success = await onAuthenticate("pin", pin);
      if (success) {
        reset();
      } else {
        setError("Invalid PIN. Please try again.");
        setPin("");
      }
    } catch (error) {
      setError("Authentication failed. Please try again.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const reset = () => {
    setMethod(null);
    setPin("");
    setError("");
    setIsAuthenticating(false);
  };

  const handleCancel = () => {
    reset();
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Secure Payment Authentication
          </DialogTitle>
          <DialogDescription>
            {orderTotal
              ? `Please authenticate to complete your order of ₹${orderTotal}`
              : "Please authenticate to complete your order"}
          </DialogDescription>
        </DialogHeader>

        {!method ? (
          <div className="space-y-4 py-4">
            <Button
              onClick={handleBiometric}
              className="w-full"
              size="lg"
              disabled={isAuthenticating}
            >
              <Fingerprint className="mr-2 h-5 w-5" />
              Use Biometric (FaceID/TouchID)
            </Button>
            <Button
              onClick={() => setMethod("pin")}
              variant="outline"
              className="w-full"
              size="lg"
              disabled={isAuthenticating}
            >
              <Lock className="mr-2 h-5 w-5" />
              Enter Device PIN
            </Button>
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
          </div>
        ) : method === "pin" ? (
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Enter your 4-6 digit PIN
              </label>
              <Input
                type="password"
                placeholder="Enter PIN"
                value={pin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setPin(value);
                  setError("");
                }}
                maxLength={6}
                autoFocus
                disabled={isAuthenticating}
                className="text-center text-2xl tracking-widest"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
            <div className="flex gap-2">
              <Button
                onClick={handlePIN}
                className="flex-1"
                disabled={pin.length < 4 || isAuthenticating}
              >
                {isAuthenticating ? "Verifying..." : "Confirm"}
              </Button>
              <Button
                onClick={() => {
                  setMethod(null);
                  setPin("");
                  setError("");
                }}
                variant="outline"
                disabled={isAuthenticating}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button
            variant="ghost"
            onClick={handleCancel}
            disabled={isAuthenticating}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

