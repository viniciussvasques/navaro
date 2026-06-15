import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * HTML shell do PWA — viewport iPhone, safe area, meta install.
 */
export default function Root({ children }: PropsWithChildren) {
    return (
        <html lang="pt-BR">
            <head>
                <meta charSet="utf-8" />
                <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
                />
                <meta name="theme-color" content="#005f73" />
                <meta name="description" content="Agende barbearias, salões e estética pelo celular." />
                <meta name="mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                <meta name="apple-mobile-web-app-title" content="DUNNAA" />
                <meta name="robots" content="noindex, nofollow" />
                <link rel="manifest" href="/app/manifest.json" />
                <link rel="icon" href="/app/favicon.ico" />
                <link rel="apple-touch-icon" href="/app/apple-touch-icon.png" />
                <ScrollViewStyleReset />
                <style
                    dangerouslySetInnerHTML={{
                        __html: `
                          html {
                            height: -webkit-fill-available;
                          }
                          body {
                            min-height: 100%;
                            min-height: 100dvh;
                            min-height: -webkit-fill-available;
                            -webkit-tap-highlight-color: transparent;
                          }
                          #root {
                            display: flex;
                            flex: 1;
                            min-height: 100%;
                            min-height: 100dvh;
                            min-height: -webkit-fill-available;
                          }
                          /* Safari (aba): permite scroll do documento para recolher a barra */
                          html.dunnaa-safari-browser {
                            overflow-y: auto;
                            overflow-x: hidden;
                            -webkit-overflow-scrolling: touch;
                          }
                          html.dunnaa-safari-browser body {
                            overflow: visible !important;
                            min-height: calc(100dvh + 2px);
                            min-height: calc(-webkit-fill-available + 2px);
                          }
                          @media (display-mode: standalone) {
                            html, body {
                              overflow: hidden !important;
                              min-height: 100dvh;
                            }
                          }
                          input, textarea {
                            font-size: 16px;
                          }
                        `,
                    }}
                />
            </head>
            <body>{children}</body>
        </html>
    );
}
