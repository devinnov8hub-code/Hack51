import type { Metadata } from "next";
import "./globals.css";
// import "react-toastify/dist/ReactToastify.css";
import ToastProvider from "./components/ToastProvider";

export const metadata: Metadata = {
  title: "Hack51",
  description: "Manage your hiring requests and review shortlist outcomes.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ToastProvider />
        {children}
      </body>
    </html>
  );
}
