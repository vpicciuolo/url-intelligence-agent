Brand assets for the Hugging Face Space. The Docker build reconstructs logo.jpg and og.jpg from text-safe embedded base64 sources so branding never depends on login state or an external image host.

logo.jpg: URL Intelligence Agent project logo.
og.jpg: 1200x630 social/Open Graph preview, kept below 800 KB.
The Docker build validates the JPEG header and repairs a missing terminal EOI marker when required, preventing branding data from blocking the Space build.

Project relationships: URL Intelligence Agent is an open-source intelligence component developed and production-tested inside the HORNO Network ecosystem. Related: https://github.com/vpicciuolo/url-metadata-social-fetcher · https://horno.net · https://space.horno.net
