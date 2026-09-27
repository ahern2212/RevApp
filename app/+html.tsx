import { ScrollViewStyleReset } from 'expo-router/html';
import type { ReactNode } from 'react';

import { THEMES } from '@/constants/themes';

// Runs before the app bundle: use the theme saved on this device for the page background.
const backgrounds = Object.fromEntries(THEMES.map((t) => [t.id, t.colors.background]));
const themeScript = `try{var b=${JSON.stringify(backgrounds)}[localStorage.getItem('revapp.theme')];if(b)document.documentElement.style.backgroundColor=document.body.style.backgroundColor=b;}catch(e){}`;

export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: `body { background-color: #e5eaf5; }` }} />
      </head>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}
