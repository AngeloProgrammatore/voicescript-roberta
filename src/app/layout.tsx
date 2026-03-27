import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "VoiceScript — Dott.ssa Roberta Costanzo",
  description: "Dalla tua voce, uno script video professionale",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <body>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "#fff",
              border: "1px solid #E8F6F4",
              color: "#1F1F1F",
              fontFamily: "'Jost', sans-serif",
            },
          }}
        />
      </body>
    </html>
  );
}
