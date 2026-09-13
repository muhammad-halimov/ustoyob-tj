/**
 * Shared Mercure (SSE) plumbing — real-time delivery for Chat and Tech Support alike
 * (see API_REFERENCE.md §5/§11): fetch a subscriber JWT from the API, then open an
 * EventSource against the hub with that token, subscribed to one or more topics.
 * Centralised here so every call site builds the hub URL the same way.
 */
const MERCURE_HUB_URL = import.meta.env.VITE_MERCURE_HUB_URL;

/**
 * Opens an EventSource against the Mercure hub for the given topic(s).
 * @param topics  One or more Mercure topics, e.g. `chat:12` or `tech-support:5`.
 * @param token   Subscriber JWT from the corresponding `/subscribe` or `inbox-token`
 *                endpoint. Omit for public/unauthenticated topics.
 */
export function openMercureSource(topics: string[], token?: string | null): EventSource {
    const hubUrl = new URL(MERCURE_HUB_URL);
    topics.forEach(topic => hubUrl.searchParams.append('topic', topic));
    if (token) hubUrl.searchParams.append('authorization', token);
    return new EventSource(hubUrl.toString());
}
