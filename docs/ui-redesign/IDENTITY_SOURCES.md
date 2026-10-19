# Identity asset sources — 19 October 2026

Team and player identities are explicit data fields, not a name-matching service. Use an image URL in the relevant team/player editor and preview it before saving. The application does not automatically assign these sources to existing records.

| Club | Primary page inspected | Image linked by that page |
| --- | --- | --- |
| Al Ahly | https://www.alahlyegypt.com/en/club | https://www.alahlyegypt.com/logo.png |
| Zamalek | https://st.zamaleksc.com/about | https://www.zamaleksc.com/img/logos.PNG |

These are club-owned identity sources, not an assertion of an open asset license. Neither image is copied into the distributed application. Availability, format, content and permission to reuse remain source-dependent; browser preview and neutral fallback handle unavailable links. The Zamalek header also references `https://st.zamaleksc.com/logo.svg`, but its fetch failed during research, so it is not the preferred candidate above.

No handball-player headshot has been assigned from a football roster, inferred from a shirt number, or generated as an actual person's identity. Supply a verified player image explicitly. Browser acceptance uses abstract SVGs marked SAMPLE on intercepted `.test` URLs; those fixtures are not production athlete images or a public remote service.

HTTPS and application-relative image paths are accepted. Data/blob/HTTP/protocol-relative URLs, embedded credentials and control characters are rejected. Image requests go directly from the browser with no referrer and without the Next image proxy. Correct broken URLs in the editor; missing images retain neutral identities. Auth avatar removal writes null and takes precedence over a provider picture.
