import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Ajv2020, type ValidateFunction } from "ajv/dist/2020.js";
import ajvFormats, { type FormatsPlugin } from "ajv-formats";
import { parse } from "yaml";

/**
 * Contract helper (05-testing-strategy.md §3.4, D-21): validates a response
 * against the matching response schema of docs/openapi.yaml, so the spec and
 * the API can't drift apart silently.
 *
 *   expectToMatchContract(res, "listProducts", 200);
 */

interface OpenApiDoc {
  paths: Record<string, Record<string, OperationObject>>;
  components: { responses?: Record<string, ResponseObject> };
}
interface OperationObject {
  operationId?: string;
  responses: Record<string, ResponseObject>;
}
interface ResponseObject {
  $ref?: string;
  content?: Record<string, unknown>;
}

const SPEC_ID = "openapi.yaml";
const specPath = join(import.meta.dirname, "../../../../docs/openapi.yaml");
const doc = parse(readFileSync(specPath, "utf8")) as OpenApiDoc;

// OpenAPI 3.1 documents are JSON Schema 2020-12 vocabularies plus annotations
// such as `example`, hence non-strict mode; `$ref`s resolve inside the doc.
const ajv = new Ajv2020({ strict: false, allErrors: true });
// ajv-formats is CommonJS: at runtime the default import is the plugin itself.
(ajvFormats as unknown as FormatsPlugin)(ajv);
ajv.addSchema(doc, SPEC_ID);

const validators = new Map<string, ValidateFunction>();

function jsonPointerEscape(segment: string): string {
  return segment.replaceAll("~", "~0").replaceAll("/", "~1");
}

function findOperation(operationId: string): { path: string; method: string; op: OperationObject } {
  for (const [path, methods] of Object.entries(doc.paths)) {
    for (const [method, op] of Object.entries(methods)) {
      if (op.operationId === operationId) return { path, method, op };
    }
  }
  throw new Error(`Operation "${operationId}" not found in docs/openapi.yaml`);
}

function validatorFor(operationId: string, status: number): ValidateFunction {
  const key = `${operationId}:${status}`;
  const cached = validators.get(key);
  if (cached) return cached;

  const { path, method, op } = findOperation(operationId);
  let response = op.responses[String(status)];
  if (!response) {
    throw new Error(`Operation "${operationId}" documents no ${status} response`);
  }
  // Shared responses (errors) are `$ref`s into #/components/responses.
  let basePointer = `#/paths/${jsonPointerEscape(path)}/${method}/responses/${status}`;
  if (response.$ref) {
    const name = response.$ref.replace("#/components/responses/", "");
    response = doc.components.responses?.[name] ?? response;
    basePointer = `#/components/responses/${name}`;
  }
  if (!response.content?.["application/json"]) {
    throw new Error(`Response ${status} of "${operationId}" has no JSON body to validate`);
  }

  const validate = ajv.compile({
    $ref: `${SPEC_ID}${basePointer}/content/application~1json/schema`,
  });
  validators.set(key, validate);
  return validate;
}

export interface JsonResponseLike {
  statusCode: number;
  json: () => unknown;
}

/** Fails when the status isn't `status` or the JSON body violates the documented schema. */
export function expectToMatchContract(
  res: JsonResponseLike,
  operationId: string,
  status: number,
): void {
  if (res.statusCode !== status) {
    throw new Error(
      `${operationId}: expected status ${status}, got ${res.statusCode}: ${JSON.stringify(res.json())}`,
    );
  }
  const validate = validatorFor(operationId, status);
  const body = res.json();
  if (!validate(body)) {
    throw new Error(
      `${operationId} ${status} violates docs/openapi.yaml:\n` +
        `${ajv.errorsText(validate.errors, { separator: "\n" })}\nBody: ${JSON.stringify(body)}`,
    );
  }
}
