import "server-only";

export function getSupabaseServerFetch(): typeof fetch | undefined {
  const internalUrl = process.env.SUPABASE_INTERNAL_URL;

  if (!internalUrl) {
    return undefined;
  }

  return (input, init) => {
    const sourceUrl =
      input instanceof Request
        ? new URL(input.url)
        : new URL(input instanceof URL ? input.href : input);
    const targetUrl = new URL(
      `${sourceUrl.pathname}${sourceUrl.search}`,
      internalUrl,
    );

    if (input instanceof Request) {
      return fetch(new Request(targetUrl, input), init);
    }

    return fetch(targetUrl, init);
  };
}
