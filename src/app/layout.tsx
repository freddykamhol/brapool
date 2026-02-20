import "./globals.css";
import ThemeRegistry from "./theme-registry";

export const metadata = {
  title: "BRApool",
  description: "BRApool",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}