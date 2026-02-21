import "./globals.css";

export const metadata = {
  title: "BRApool",
  description: "BRApool",
  icons: {
    icon: "/logo-mark.svg",
    shortcut: "/logo-mark.svg",
    apple: "/logo-mark.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className="dark">
      <body>
        {children}
      </body>
    </html>
  );
}
