import { ScrollViewStyleReset } from "expo-router/html";
import { type PropsWithChildren } from "react";

/**
 * HTML raiz que envolve TODAS as páginas no export web (SSG).
 * É renderizado só no Node, em build — não tem acesso a APIs do navegador
 * nem ao Context da aplicação. Aqui injetamos manifest PWA + meta tags do iOS.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />

        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#208AEF" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* iOS: Safari ignora boa parte do manifest, precisa destas tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Rota Flow" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />

        {/*
          Desativa o scroll do body para o root view ocupar a tela toda,
          replicando o comportamento nativo. Recomendado pelo Expo Router.
        */}
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
