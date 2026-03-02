import "./globals.css";

export const metadata = {
  title: "BRApool",
  description: "BRApool",
  icons: {
    icon: "/logo-rettungswache-brakel2.png",
    shortcut: "/logo-rettungswache-brakel2.png",
    apple: "/logo-rettungswache-brakel2.png",
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
