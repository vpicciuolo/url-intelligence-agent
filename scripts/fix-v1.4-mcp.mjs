import fs from "node:fs";

const path = "src/mcp.ts";
let source = fs.readFileSync(path, "utf8");
const start = source.indexOf("const normalizedEvidenceSchema =");
const end = source.indexOf("\n\nexport type McpMessage", start);
if (start < 0 || end < 0) throw new Error("Generated MCP schema block not found");

const block = `const normalizedEvidenceSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: true,
  required: ["kind"],
  properties: {
    kind: { type: "string", enum: ["string", "number", "date", "url", "money", "boolean", "json"] },
    value: {},
    folded: { type: "string" },
    exact: { type: "boolean" },
    approximate: { type: "boolean" },
    min: { type: ["number", "null"] },
    max: { type: ["number", "null"] },
    comparator: { type: "string" },
    amount: { type: "number" },
    currency: { type: "string" },
    cadence: { type: "string" },
    precision: { type: "string" }
  }
};

const observationSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: true,
  required: ["id", "subject", "predicate", "rawValue", "normalizedValue", "source", "temporal", "integrity", "quality"],
  properties: {
    id: { type: "string" },
    subject: { type: "string" },
    predicate: { type: "string" },
    rawValue: {},
    normalizedValue: normalizedEvidenceSchema,
    source: {
      type: "object",
      additionalProperties: true,
      required: ["pageUrl", "finalUrl", "representation", "layer"],
      properties: {
        pageUrl: { type: "string" },
        finalUrl: { type: "string" },
        representation: { type: "string" },
        layer: { type: "string" },
        property: { type: "string" },
        locator: { type: "string" },
        jsonPointer: { type: "string" },
        visibility: { type: "string" }
      }
    },
    temporal: {
      type: "object",
      additionalProperties: true,
      required: ["observedAt"],
      properties: {
        observedAt: { type: "string" },
        publishedAt: { type: "string" },
        modifiedAt: { type: "string" },
        lastModified: { type: "string" }
      }
    },
    integrity: {
      type: "object",
      additionalProperties: true,
      required: ["observationHash"],
      properties: {
        observationHash: { type: "string" },
        documentHash: { type: "string" }
      }
    },
    quality: {
      type: "object",
      additionalProperties: false,
      required: ["extractionConfidence", "sourceAuthority", "freshnessConfidence"],
      properties: {
        extractionConfidence: { type: "number" },
        sourceAuthority: { type: "number" },
        freshnessConfidence: { type: "number" }
      }
    }
  }
};

const conflictSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["observationIds", "relation", "severity", "explanation"],
  properties: {
    observationIds: { type: "array", items: { type: "string" } },
    relation: { type: "string" },
    severity: { type: "string", enum: ["none", "low", "medium", "high"] },
    explanation: { type: "string" }
  }
};

const claimSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: true,
  required: ["id", "subject", "predicate", "value", "status", "observationIds", "flags", "resolution", "conflicts"],
  properties: {
    id: { type: "string" },
    subject: { type: "string" },
    predicate: { type: "string" },
    value: normalizedEvidenceSchema,
    displayValue: {},
    status: { type: "string", enum: ["consensus", "compatible_variation", "drift", "conflict", "insufficient_evidence"] },
    observationIds: { type: "array", items: { type: "string" } },
    flags: { type: "array", items: { type: "string" } },
    resolution: {
      type: "object",
      additionalProperties: false,
      required: ["confidence", "policy", "explanation"],
      properties: {
        preferredObservationId: { type: "string" },
        confidence: { type: "number" },
        policy: { type: "string" },
        explanation: { type: "array", items: { type: "string" } }
      }
    },
    conflicts: { type: "array", items: conflictSchema }
  }
};

const provenanceSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: true,
  required: ["schemaVersion", "generatedAt", "summary", "claims", "observations", "warnings"],
  properties: {
    schemaVersion: { type: "string" },
    generatedAt: { type: "string" },
    summary: {
      type: "object",
      additionalProperties: true,
      required: ["totalObservations", "totalClaims", "conflictClaims", "driftClaims", "staleMetadataSuspected"],
      properties: {
        totalObservations: { type: "integer" },
        totalClaims: { type: "integer" },
        consensusClaims: { type: "integer" },
        compatibleClaims: { type: "integer" },
        driftClaims: { type: "integer" },
        conflictClaims: { type: "integer" },
        staleMetadataSuspected: { type: "integer" },
        layers: { type: "array", items: { type: "string" } },
        representations: { type: "array", items: { type: "string" } }
      }
    },
    selection: {
      type: "object",
      additionalProperties: false,
      properties: {
        predicate: { type: ["string", "null"] },
        totalMatchedClaims: { type: "integer" },
        returnedClaims: { type: "integer" },
        limit: { type: "integer" },
        truncated: { type: "boolean" }
      }
    },
    claims: { type: "array", items: claimSchema },
    observations: { type: "array", items: observationSchema },
    warnings: { type: "array", items: { type: "string" } }
  }
};

const verificationMatchSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: true,
  required: ["claimId", "predicate", "status", "relation", "severity", "explanation", "confidence", "observationIds"],
  properties: {
    claimId: { type: "string" },
    predicate: { type: "string" },
    status: { type: "string" },
    relation: { type: "string" },
    severity: { type: "string" },
    explanation: { type: "string" },
    resolvedValue: {},
    confidence: { type: "number" },
    observationIds: { type: "array", items: { type: "string" } }
  }
};

function outputSchemaFor(name: string): Record<string, unknown> {
  if (name === "verify_claim") {
    return objectSchema({
      meta: { type: "object" },
      verification: {
        type: "object",
        additionalProperties: true,
        required: ["status", "predicate"],
        properties: {
          status: { type: "string", enum: ["supported", "compatible", "contradicted", "not_found"] },
          predicate: { type: "string" },
          claimedValue: {},
          normalized: normalizedEvidenceSchema,
          matches: { type: "array", items: verificationMatchSchema }
        }
      }
    }, ["verification"]);
  }
  if (name === "inspect_provenance") {
    return objectSchema({ meta: { type: "object" }, provenance: provenanceSchema, prov: { type: "object" } }, ["provenance"]);
  }
  if (name === "investigate_url") {
    return { type: "object", additionalProperties: true, properties: { provenance: provenanceSchema } };
  }
  return { type: "object", additionalProperties: true };
}`;

source = source.slice(0, start) + block + source.slice(end);
fs.writeFileSync(path, source, "utf8");
console.log("Normalized v1.4 MCP output schema block");
