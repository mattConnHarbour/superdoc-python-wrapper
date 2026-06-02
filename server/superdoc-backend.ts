#!/usr/bin/env npx tsx
/**
 * SuperDoc backend for stdin/stdout communication.
 * Spawned by Python, communicates via JSON over pipes.
 */

import * as readline from 'readline';
import { JSDOM } from 'jsdom';
import { Editor, getStarterExtensions, BLANK_DOCX_BASE64 } from 'superdoc/super-editor';
import * as fs from 'fs';
import * as path from 'path';

let activeEditor: Editor | null = null;

async function createEditor(docxBuffer?: Buffer): Promise<Editor> {
  const buffer = docxBuffer ?? Buffer.from(BLANK_DOCX_BASE64, 'base64');
  const { window } = new JSDOM('<!DOCTYPE html><html><body></body></html>');

  const [content, mediaFiles] = await Editor.loadXmlData(buffer);

  return new Editor({
    isHeadless: true,
    document: window.document as any,
    extensions: getStarterExtensions(),
    content,
    mediaFiles,
  });
}

async function handleCommand(cmd: any): Promise<any> {
  const { method, params = {} } = cmd;

  try {
    switch (method) {
      case 'open': {
        const { path: filePath } = params;
        if (filePath && fs.existsSync(filePath)) {
          const buffer = fs.readFileSync(filePath);
          activeEditor?.destroy();
          activeEditor = await createEditor(buffer);
          return { result: { message: `Opened ${filePath}` } };
        }
        activeEditor?.destroy();
        activeEditor = await createEditor();
        return { result: { message: 'Created blank document' } };
      }

      case 'reset': {
        activeEditor?.destroy();
        activeEditor = null;
        return { result: { message: 'Session reset' } };
      }

      case 'export': {
        if (!activeEditor) {
          return { error: 'No document open' };
        }
        const { path: outPath } = params;
        const docxBuffer = await activeEditor.exportDocx();
        if (outPath) {
          fs.writeFileSync(outPath, Buffer.from(docxBuffer));
          return { result: { message: `Exported to ${outPath}` } };
        }
        return { result: { base64: Buffer.from(docxBuffer).toString('base64') } };
      }

      case 'invoke': {
        if (!activeEditor) {
          // Auto-create blank document
          activeEditor = await createEditor();
        }
        const { operationId, input = {} } = params;
        const result = await (activeEditor as any).doc.invoke({ operationId, input });
        return { result };
      }

      case 'ping': {
        return { result: 'pong' };
      }

      default:
        return { error: `Unknown method: ${method}` };
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    crlfDelay: Infinity,
  });

  // Signal ready
  console.log(JSON.stringify({ ready: true }));

  for await (const line of rl) {
    if (!line.trim()) continue;

    try {
      const cmd = JSON.parse(line);
      const response = await handleCommand(cmd);
      console.log(JSON.stringify(response));
    } catch (err) {
      console.log(JSON.stringify({ error: `Invalid JSON: ${err}` }));
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
