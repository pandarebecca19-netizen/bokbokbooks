import "./globals.css";

const siteUrl =
  (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
  (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
  "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: "나의 책장",
  description: "읽은 책을 기록하고 정리하는 나만의 책장",
  openGraph: {
    title: "나의 책장",
    description: "읽은 책을 기록하고 정리하는 나만의 책장",
    type: "website",
    locale: "ko_KR",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className="font-sans">{children}</body>
    </html>
  );
}
