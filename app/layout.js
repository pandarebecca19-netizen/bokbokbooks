import "./globals.css";

export const metadata = {
  title: "나의 책장",
  description: "읽은 책을 기록하고 정리하는 나만의 책장",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className="font-sans">{children}</body>
    </html>
  );
}
