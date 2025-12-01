import "./globals.css";
import { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dew Point Advisor",
  description: "Dew point and ventilation helper rebuilt for Vercel"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}



<<<<<<< HEAD

=======
>>>>>>> fa1bb5b0465252f8db71f4913c8cf6c49b779aff
