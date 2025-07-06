import type { Metadata } from "next";
import "./globals.css";

// 移除 Google Fonts 依赖，使用系统字体
const systemFonts = {
  sans: [
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Roboto',
    '"Helvetica Neue"',
    'Arial',
    'sans-serif'
  ].join(', '),
  mono: [
    'SFMono-Regular',
    'Consolas',
    '"Liberation Mono"',
    'Menlo',
    'Courier',
    'monospace'
  ].join(', ')
};

export const metadata: Metadata = {
  title: "WebGAL Voice UI",
  description: "WebGAL 语音合成工具的 Web 界面",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased"
        style={{
          fontFamily: systemFonts.sans,
          '--font-mono': systemFonts.mono
        } as React.CSSProperties}
      >
        {children}
      </body>
    </html>
  );
}
