import { useState, type ReactNode } from "react";
import type { Decorator, Preview } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { Toaster } from "sonner";
import ko from "../src/shared/config/messages/ko.json";
import en from "../src/shared/config/messages/en.json";
import "../src/app/globals.css";

const MESSAGES = { ko, en } as const;

/**
 * Seed react-query with data a story needs, so data-bound components render
 * without a backend:
 *
 *   parameters: { queries: [[["friendship", "friends"], [...]]] }
 *
 * Every story gets its own client (no retries, nothing refetches by itself).
 */
function Providers({ queries, children }: { queries: [readonly unknown[], unknown][]; children: ReactNode }) {
  const [client] = useState(() => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity, refetchOnWindowFocus: false } },
    });
    for (const [key, data] of queries) qc.setQueryData(key, data);
    return qc;
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const withProviders: Decorator = (Story, context) => {
  const locale = (context.globals.locale ?? "ko") as keyof typeof MESSAGES;
  return (
    <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]} timeZone="Asia/Seoul">
      <Providers queries={context.parameters.queries ?? []}>
        <Story />
        <Toaster position="bottom-center" />
      </Providers>
    </NextIntlClientProvider>
  );
};

const preview: Preview = {
  decorators: [withProviders],
  globalTypes: {
    locale: {
      description: "Language",
      toolbar: {
        title: "Locale",
        icon: "globe",
        items: [
          { value: "ko", title: "한국어" },
          { value: "en", title: "English" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { locale: "ko" },
  parameters: {
    layout: "padded",
    nextjs: { appDirectory: true },
    controls: { matchers: { color: /(background|color)$/i } },
    backgrounds: { disable: true },
  },
};

export default preview;
