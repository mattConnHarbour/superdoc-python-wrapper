#!/usr/bin/env npx tsx
/**
 * Generates the operation list for the DSL from the superdoc package.
 * Run: npx tsx scripts/generate-operations.ts > server/operations.ts
 *
 * This ensures the DSL always matches the superdoc API.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Find the operation definitions file in node_modules
// This file isn't exported but we can read it directly
const definitionsPath = resolve(
  __dirname,
  '../node_modules/superdoc/dist/document-api/src/contract/operation-definitions.d.ts'
);

const content = readFileSync(definitionsPath, 'utf-8');

// Extract operation definitions with their descriptions and groups
// Pattern matches blocks like:
//   readonly 'operation.name': {
//     readonly memberPath: "operation.name";
//     readonly description: "Description here";
//     ...
//     readonly referenceGroup: "groupName";
//   };
const operationBlockRegex = /readonly '([^']+)':\s*\{[^}]*readonly description:\s*"([^"]+)"[^}]*readonly referenceGroup:\s*"([^"]+)"/g;

interface OpInfo {
  id: string;
  description: string;
  group: string;
}

const operations: OpInfo[] = [];
let match;

while ((match = operationBlockRegex.exec(content)) !== null) {
  operations.push({
    id: match[1],
    description: match[2],
    group: match[3],
  });
}

// Sort by ID for consistency
operations.sort((a, b) => a.id.localeCompare(b.id));

// Group operations by referenceGroup
const groups = new Map<string, OpInfo[]>();
for (const op of operations) {
  if (!groups.has(op.group)) {
    groups.set(op.group, []);
  }
  groups.get(op.group)!.push(op);
}

// Generate TypeScript
const output = `// Auto-generated from superdoc package - DO NOT EDIT
// Run: npx tsx scripts/generate-operations.ts > server/operations.ts

export const OPERATIONS = [
${operations.map(op => `  '${op.id}',`).join('\n')}
] as const;

export type OperationId = typeof OPERATIONS[number];

export const OPERATION_DESCRIPTIONS: Record<string, string> = {
${operations.map(op => `  '${op.id}': ${JSON.stringify(op.description)},`).join('\n')}
};

export const OPERATION_GROUPS: Record<string, string> = {
${operations.map(op => `  '${op.id}': '${op.group}',`).join('\n')}
};

// Operations grouped by category
export const GROUPS: Record<string, readonly string[]> = {
${Array.from(groups.entries()).map(([group, ops]) =>
  `  '${group}': [${ops.map(o => `'${o.id}'`).join(', ')}],`
).join('\n')}
};
`;

console.log(output);
