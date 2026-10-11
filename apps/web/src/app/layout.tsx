import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { CartHydrator } from "@/components/cart-hydrator";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta-sans",
});

export const metadata: Metadata = {
  title: "Cupcake Store",
  description: "Peça seus cupcakes favoritos e retire na loja.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={plusJakartaSans.variable}>
      <body className="flex min-h-screen flex-col">
        <CartHydrator />
        {children}
        <Toaster
          position="bottom-center"
          duration={4000}
          toastOptions={{ classNames: { toast: "bg-foreground text-background border-0" } }}
        />
      </body>
    </html>
  );
}
