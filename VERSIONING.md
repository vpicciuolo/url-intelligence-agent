# Versioning and compatibility policy

URL Intelligence Agent follows Semantic Versioning for the application/package surface and separately versions machine-readable evidence schemas and protocol compatibility.

Current application release: **1.2.0**  
Current provenance schema: **1.0**

## Application versions

`MAJOR.MINOR.PATCH`

- **MAJOR**: intentionally incompatible public API/output semantics, removed actions, renamed required fields, or a new canonical data model that requires consumer migration.
- **MINOR**: backward-compatible capabilities, new actions, new optional fields, new evidence layers, new protocol versions, new reports or new analyzers.
- **PATCH**: compatible fixes, extraction corrections, security hardening, documentation/test changes and implementation improvements that do not require consumer migration.

The `VERSION` file, `package.json`, `PROJECT.version`, release documentation, hosted `/health` response and deployed Hugging Face runtime must agree before a release is considered complete.

## Evidence schema versions

Machine-readable provenance has its own schema identifier (`provenance.schemaVersion`). It is not automatically tied to the npm/application version.

Schema policy:

- additive optional observation/claim properties: schema minor-compatible and may remain within the same major schema identifier;
- changed meanings, removed required keys or incompatible normalization semantics: new provenance schema major version;
- consumers should ignore unknown optional properties and should not infer truth probability from confidence fields;
- raw observations and hashes remain the audit layer; resolved claims are derived outputs and can improve between application versions.

## Output compatibility

The v1.x application line preserves the existing flattened intelligence fields such as `entity`, `seo`, `security`, `trust`, `pages`, `technologies`, `brand`, `rag`, `contradictions` and `warnings`.

v1.2.0 adds `provenance` as the detailed evidence layer. Existing fields remain available for compatibility. A future v2 may make resolved claims the canonical model and expose older flattened fields as compatibility aliases.

## MCP compatibility

Supported protocol versions are declared by the runtime rather than inferred from the application version.

v1.2.0 supports:

- `2026-07-28` — modern stateless transport, discovery, routing metadata and optional Tasks extension;
- `2025-11-25`;
- `2025-06-18`;
- `2025-03-26`.

Legacy MCP clients continue to use initialization/session behavior. Modern clients should use the current stateless contract and advertise optional extensions explicitly.

Removal of a previously supported MCP protocol requires at least a MINOR release announcement and should normally be deferred to a MAJOR application release unless the protocol has a material security defect.

## Security compatibility

Security hardening can be shipped in PATCH releases even when it causes previously accepted unsafe/private destinations or malformed requests to be rejected. Such changes are treated as bug/security fixes rather than compatibility breaks.

Browser rendering is a separate network trust boundary from the guarded core HTTP transport. Production operators must not interpret application-level browser filtering as equivalent to infrastructure egress isolation.

## Deprecation policy

A public action, response field or protocol version should be documented as deprecated before removal. Unless a security issue requires faster action, removal occurs no earlier than the next MAJOR application version.

Deprecation notices should identify:

1. the deprecated feature;
2. the replacement;
3. the first version carrying the notice;
4. the earliest removal version.

## Release checklist

A release is complete only when all applicable items pass:

1. version files agree;
2. typecheck and deterministic tests pass on supported Node.js versions;
3. security regression tests pass;
4. changelog and versioning docs are updated;
5. MCP schemas/protocol metadata match runtime behavior;
6. Hugging Face Docker Space builds successfully;
7. live `/health`, `/actions` and `/.well-known/mcp.json` reflect the release;
8. hosted UI assets load and the Evidence Inspector can render the new output;
9. benchmark/schema documentation is synchronized;
10. GitHub main and the deployed Hugging Face Space identify the same release.
