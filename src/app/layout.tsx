import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import Link from "next/link";
import AppInit from "./AppInit";
import "./globals.css";

export const metadata: Metadata = {
  title: "Simple Budget",
};

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/import", label: "Import" },
  { href: "/transactions", label: "Transactions" },
  { href: "/categories", label: "Categories" },
  { href: "/recurring", label: "Recurring" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} h-full`}>
      <body className="h-full flex antialiased bg-gray-50 text-gray-900">
        <AppInit />
        <aside className="w-52 shrink-0 bg-white border-r border-gray-200 flex flex-col">
          <div className="px-5 py-5 border-b border-gray-200">
            <span className="text-base font-semibold tracking-tight text-gray-900">
              Simple Budget
            </span>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-0.5">
            {navItems.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center px-3 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                {label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="flex-1 overflow-auto">{children}</main>
      </body>
    </html>
  );
}
