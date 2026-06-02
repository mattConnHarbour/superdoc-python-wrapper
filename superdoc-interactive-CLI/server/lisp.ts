/**
 * Clojure-style Lisp interpreter for SuperDoc CLI.
 *
 * Syntax:
 *   (doc-open)                          ; blank document
 *   (doc-open :path "file.docx")        ; load file
 *   (doc-create-paragraph :text "Hi")   ; add paragraph
 *   (def x 42)                          ; define variable
 *   (defn greet [name] (str "Hi " name)); define function
 *   (let [x 1 y 2] (+ x y))             ; local bindings
 *   (-> x (f) (g))                      ; threading macro
 */

import http from 'http';

// ============================================================================
// TYPES
// ============================================================================

type LispValue =
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'symbol'; value: string }
  | { type: 'keyword'; value: string }
  | { type: 'list'; value: LispValue[] }
  | { type: 'vector'; value: LispValue[] }
  | { type: 'map'; value: Map<string, LispValue> }
  | { type: 'nil' }
  | { type: 'bool'; value: boolean }
  | { type: 'function'; name: string; fn: BuiltinFn }
  | { type: 'lambda'; params: string[]; body: LispValue[]; env: Env }
  | { type: 'object'; value: Record<string, unknown> };

type BuiltinFn = (args: LispValue[], env: Env) => LispValue | Promise<LispValue>;
type Env = Map<string, LispValue>;

// ============================================================================
// PARSER
// ============================================================================

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let i = 0;

  while (i < input.length) {
    const char = input[i];

    // Skip whitespace and commas (commas are whitespace in Clojure)
    if (/[\s,]/.test(char)) {
      i++;
      continue;
    }

    // Comments
    if (char === ';') {
      while (i < input.length && input[i] !== '\n') i++;
      continue;
    }

    // Brackets
    if ('()[]{}@'.includes(char)) {
      tokens.push(char);
      i++;
      continue;
    }

    // Quote/syntax quote
    if (char === "'" || char === '`' || char === '~') {
      tokens.push(char);
      i++;
      continue;
    }

    // Strings
    if (char === '"') {
      let str = '"';
      i++;
      while (i < input.length && input[i] !== '"') {
        if (input[i] === '\\' && i + 1 < input.length) {
          str += input[i++];
        }
        str += input[i++];
      }
      str += '"';
      i++;
      tokens.push(str);
      continue;
    }

    // Numbers, symbols, keywords
    let token = '';
    while (i < input.length && !/[\s,(){}\[\]'"`~;@]/.test(input[i])) {
      token += input[i++];
    }
    if (token) tokens.push(token);
  }

  return tokens;
}

function parse(tokens: string[]): LispValue[] {
  const expressions: LispValue[] = [];
  let pos = 0;

  function parseExpr(): LispValue {
    if (pos >= tokens.length) throw new Error('Unexpected end of input');
    const token = tokens[pos++];

    // List
    if (token === '(') {
      const list: LispValue[] = [];
      while (tokens[pos] !== ')') {
        if (pos >= tokens.length) throw new Error('Unexpected end of input, expected )');
        list.push(parseExpr());
      }
      pos++; // skip ')'
      return { type: 'list', value: list };
    }

    // Vector
    if (token === '[') {
      const vec: LispValue[] = [];
      while (tokens[pos] !== ']') {
        if (pos >= tokens.length) throw new Error('Unexpected end of input, expected ]');
        vec.push(parseExpr());
      }
      pos++; // skip ']'
      return { type: 'vector', value: vec };
    }

    // Map
    if (token === '{') {
      const map = new Map<string, LispValue>();
      while (tokens[pos] !== '}') {
        if (pos >= tokens.length) throw new Error('Unexpected end of input, expected }');
        const key = parseExpr();
        if (pos >= tokens.length) throw new Error('Map literal requires even number of forms');
        const val = parseExpr();
        const keyStr = key.type === 'keyword' ? key.value : key.type === 'string' ? key.value : print(key);
        map.set(keyStr, val);
      }
      pos++; // skip '}'
      return { type: 'map', value: map };
    }

    // Quote
    if (token === "'") {
      return { type: 'list', value: [{ type: 'symbol', value: 'quote' }, parseExpr()] };
    }

    // Deref @
    if (token === '@') {
      return { type: 'list', value: [{ type: 'symbol', value: 'deref' }, parseExpr()] };
    }

    // String
    if (token.startsWith('"')) {
      const str = token.slice(1, -1).replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"');
      return { type: 'string', value: str };
    }

    // Keyword
    if (token.startsWith(':')) {
      return { type: 'keyword', value: token.slice(1) };
    }

    // Nil
    if (token === 'nil') return { type: 'nil' };

    // Booleans
    if (token === 'true') return { type: 'bool', value: true };
    if (token === 'false') return { type: 'bool', value: false };

    // Number
    const num = parseFloat(token);
    if (!isNaN(num)) return { type: 'number', value: num };

    // Symbol
    return { type: 'symbol', value: token };
  }

  while (pos < tokens.length) {
    expressions.push(parseExpr());
  }

  return expressions;
}

// ============================================================================
// PRINTER
// ============================================================================

function print(val: LispValue): string {
  switch (val.type) {
    case 'nil': return 'nil';
    case 'bool': return val.value ? 'true' : 'false';
    case 'number': return String(val.value);
    case 'string': return `"${val.value}"`;
    case 'symbol': return val.value;
    case 'keyword': return `:${val.value}`;
    case 'list': return `(${val.value.map(print).join(' ')})`;
    case 'vector': return `[${val.value.map(print).join(' ')}]`;
    case 'map': {
      const pairs: string[] = [];
      val.value.forEach((v, k) => pairs.push(`:${k} ${print(v)}`));
      return `{${pairs.join(' ')}}`;
    }
    case 'object': return JSON.stringify(val.value, null, 2);
    case 'function': return `#<fn:${val.name}>`;
    case 'lambda': return `#<fn>`;
  }
}

function toLispValue(obj: unknown): LispValue {
  if (obj === null || obj === undefined) return { type: 'nil' };
  if (typeof obj === 'boolean') return { type: 'bool', value: obj };
  if (typeof obj === 'number') return { type: 'number', value: obj };
  if (typeof obj === 'string') return { type: 'string', value: obj };
  if (Array.isArray(obj)) return { type: 'vector', value: obj.map(toLispValue) };
  if (typeof obj === 'object') return { type: 'object', value: obj as Record<string, unknown> };
  return { type: 'string', value: String(obj) };
}

function toJS(val: LispValue): unknown {
  switch (val.type) {
    case 'nil': return null;
    case 'bool': return val.value;
    case 'number': return val.value;
    case 'string': return val.value;
    case 'symbol': return val.value;
    case 'keyword': return val.value;
    case 'list': return val.value.map(toJS);
    case 'vector': return val.value.map(toJS);
    case 'map': {
      const obj: Record<string, unknown> = {};
      val.value.forEach((v, k) => obj[k] = toJS(v));
      return obj;
    }
    case 'object': return val.value;
    case 'function': return `#<fn:${val.name}>`;
    case 'lambda': return '#<fn>';
  }
}

// ============================================================================
// EVALUATOR
// ============================================================================

function isTruthy(val: LispValue): boolean {
  return !(val.type === 'nil' || (val.type === 'bool' && !val.value));
}

async function evaluate(expr: LispValue, env: Env): Promise<LispValue> {
  switch (expr.type) {
    case 'number':
    case 'string':
    case 'bool':
    case 'nil':
    case 'keyword':
    case 'object':
      return expr;

    case 'vector': {
      const vals: LispValue[] = [];
      for (const item of expr.value) {
        vals.push(await evaluate(item, env));
      }
      return { type: 'vector', value: vals };
    }

    case 'map': {
      const map = new Map<string, LispValue>();
      for (const [k, v] of expr.value) {
        map.set(k, await evaluate(v, env));
      }
      return { type: 'map', value: map };
    }

    case 'symbol': {
      const val = env.get(expr.value);
      if (val === undefined) throw new Error(`Unable to resolve symbol: ${expr.value}`);
      return val;
    }

    case 'list': {
      if (expr.value.length === 0) return { type: 'list', value: [] };

      const first = expr.value[0];
      if (first.type === 'symbol') {
        const name = first.value;

        // Special forms
        if (name === 'quote') {
          return expr.value[1];
        }

        if (name === 'if') {
          const cond = await evaluate(expr.value[1], env);
          return evaluate(expr.value[isTruthy(cond) ? 2 : 3] ?? { type: 'nil' }, env);
        }

        if (name === 'do') {
          let result: LispValue = { type: 'nil' };
          for (let i = 1; i < expr.value.length; i++) {
            result = await evaluate(expr.value[i], env);
          }
          return result;
        }

        if (name === 'def') {
          const sym = expr.value[1];
          if (sym.type !== 'symbol') throw new Error('def requires a symbol');
          const val = await evaluate(expr.value[2], env);
          env.set(sym.value, val);
          return val;
        }

        if (name === 'defn') {
          // (defn name [params] body...)
          const sym = expr.value[1];
          if (sym.type !== 'symbol') throw new Error('defn requires a symbol');
          const params = expr.value[2];
          if (params.type !== 'vector') throw new Error('defn requires a vector of parameters');
          const paramNames = params.value.map(p => {
            if (p.type !== 'symbol') throw new Error('defn parameters must be symbols');
            return p.value;
          });
          const body = expr.value.slice(3);
          const lambda: LispValue = { type: 'lambda', params: paramNames, body, env: new Map(env) };
          env.set(sym.value, lambda);
          return lambda;
        }

        if (name === 'fn') {
          // (fn [params] body...)
          const params = expr.value[1];
          if (params.type !== 'vector') throw new Error('fn requires a vector of parameters');
          const paramNames = params.value.map(p => {
            if (p.type !== 'symbol') throw new Error('fn parameters must be symbols');
            return p.value;
          });
          const body = expr.value.slice(2);
          return { type: 'lambda', params: paramNames, body, env: new Map(env) };
        }

        if (name === 'let') {
          // (let [x 1 y 2] body...)
          const bindings = expr.value[1];
          if (bindings.type !== 'vector') throw new Error('let requires a vector of bindings');
          if (bindings.value.length % 2 !== 0) throw new Error('let requires an even number of binding forms');

          const newEnv = new Map(env);
          for (let i = 0; i < bindings.value.length; i += 2) {
            const sym = bindings.value[i];
            if (sym.type !== 'symbol') throw new Error('let binding names must be symbols');
            const val = await evaluate(bindings.value[i + 1], newEnv);
            newEnv.set(sym.value, val);
          }

          let result: LispValue = { type: 'nil' };
          for (let i = 2; i < expr.value.length; i++) {
            result = await evaluate(expr.value[i], newEnv);
          }
          return result;
        }

        if (name === 'cond') {
          for (let i = 1; i < expr.value.length; i += 2) {
            const test = expr.value[i];
            if (test.type === 'keyword' && test.value === 'else') {
              return evaluate(expr.value[i + 1], env);
            }
            const cond = await evaluate(test, env);
            if (isTruthy(cond)) {
              return evaluate(expr.value[i + 1], env);
            }
          }
          return { type: 'nil' };
        }

        if (name === 'when') {
          const cond = await evaluate(expr.value[1], env);
          if (isTruthy(cond)) {
            let result: LispValue = { type: 'nil' };
            for (let i = 2; i < expr.value.length; i++) {
              result = await evaluate(expr.value[i], env);
            }
            return result;
          }
          return { type: 'nil' };
        }

        if (name === 'and') {
          let result: LispValue = { type: 'bool', value: true };
          for (let i = 1; i < expr.value.length; i++) {
            result = await evaluate(expr.value[i], env);
            if (!isTruthy(result)) return result;
          }
          return result;
        }

        if (name === 'or') {
          for (let i = 1; i < expr.value.length; i++) {
            const result = await evaluate(expr.value[i], env);
            if (isTruthy(result)) return result;
          }
          return { type: 'nil' };
        }

        // Threading macro ->
        if (name === '->') {
          let result = await evaluate(expr.value[1], env);
          for (let i = 2; i < expr.value.length; i++) {
            const form = expr.value[i];
            if (form.type === 'list') {
              // Insert result as first arg: (f a b) -> (f result a b)
              const newList: LispValue = {
                type: 'list',
                value: [form.value[0], result, ...form.value.slice(1)]
              };
              result = await evaluate(newList, env);
            } else if (form.type === 'symbol') {
              // Bare symbol: f -> (f result)
              const newList: LispValue = { type: 'list', value: [form, result] };
              result = await evaluate(newList, env);
            } else {
              throw new Error('-> forms must be lists or symbols');
            }
          }
          return result;
        }

        // Threading macro ->>
        if (name === '->>') {
          let result = await evaluate(expr.value[1], env);
          for (let i = 2; i < expr.value.length; i++) {
            const form = expr.value[i];
            if (form.type === 'list') {
              // Insert result as last arg: (f a b) -> (f a b result)
              const newList: LispValue = {
                type: 'list',
                value: [...form.value, result]
              };
              result = await evaluate(newList, env);
            } else if (form.type === 'symbol') {
              const newList: LispValue = { type: 'list', value: [form, result] };
              result = await evaluate(newList, env);
            } else {
              throw new Error('->> forms must be lists or symbols');
            }
          }
          return result;
        }
      }

      // Function call
      const fn = await evaluate(first, env);
      const args: LispValue[] = [];
      for (let i = 1; i < expr.value.length; i++) {
        args.push(await evaluate(expr.value[i], env));
      }

      if (fn.type === 'function') {
        return fn.fn(args, env);
      }

      if (fn.type === 'lambda') {
        const newEnv = new Map(fn.env);
        for (let i = 0; i < fn.params.length; i++) {
          newEnv.set(fn.params[i], args[i] ?? { type: 'nil' });
        }
        let result: LispValue = { type: 'nil' };
        for (const bodyExpr of fn.body) {
          result = await evaluate(bodyExpr, newEnv);
        }
        return result;
      }

      // Keywords as functions (get from map)
      if (fn.type === 'keyword') {
        const coll = args[0];
        if (coll.type === 'map') {
          return coll.value.get(fn.value) ?? { type: 'nil' };
        }
        if (coll.type === 'object') {
          return toLispValue(coll.value[fn.value]);
        }
        return { type: 'nil' };
      }

      throw new Error(`${print(fn)} is not a function`);
    }

    default:
      return expr;
  }
}

// ============================================================================
// HTTP API HELPER
// ============================================================================

const API_BASE = 'http://127.0.0.1:3002/internal';

function apiCall(endpoint: string, data?: Record<string, unknown>): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_BASE}/${endpoint}`);
    const options: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: data ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          reject(new Error(`Invalid JSON response: ${body}`));
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// Parse keyword arguments from args list: :key value :key2 value2 -> {key: value, key2: value2}
function parseKeywordArgs(args: LispValue[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const val = args[i + 1];
    if (key.type === 'keyword') {
      result[key.value] = toJS(val);
    }
  }
  return result;
}

// ============================================================================
// DOC API BINDINGS
// ============================================================================

function createDocApi(): Record<string, LispValue> {
  const docFn = (name: string, endpoint: string, fn?: BuiltinFn): LispValue => ({
    type: 'function',
    name,
    fn: fn ?? (async (args) => {
      const kwargs = parseKeywordArgs(args);
      const result = await apiCall(endpoint, kwargs);
      if (result.error) throw new Error(String(result.error));
      return toLispValue(result);
    }),
  });

  const invokeFn = (lispName: string, operationId: string): LispValue => ({
    type: 'function',
    name: lispName,
    fn: async (args) => {
      const kwargs = parseKeywordArgs(args);
      const result = await apiCall('doc/invoke', { operationId, input: kwargs });
      if (result.error) throw new Error(String(result.error));
      return toLispValue(result.result);
    },
  });

  return {
    // ========================================================================
    // CORE OPERATIONS
    // ========================================================================
    'doc-open': docFn('doc-open', 'doc/open'),
    'doc-info': invokeFn('doc-info', 'info'),
    'doc-get': invokeFn('doc-get', 'get'),
    'doc-get-text': invokeFn('doc-get-text', 'getText'),
    'doc-get-markdown': invokeFn('doc-get-markdown', 'getMarkdown'),
    'doc-get-html': invokeFn('doc-get-html', 'getHtml'),
    'doc-markdown-to-fragment': invokeFn('doc-markdown-to-fragment', 'markdownToFragment'),
    'doc-find': invokeFn('doc-find', 'find'),
    'doc-get-node': invokeFn('doc-get-node', 'getNode'),
    'doc-get-node-by-id': invokeFn('doc-get-node-by-id', 'getNodeById'),
    'doc-capabilities': invokeFn('doc-capabilities', 'capabilities.get'),
    'doc-extract': invokeFn('doc-extract', 'extract'),

    // ========================================================================
    // CREATE OPERATIONS
    // ========================================================================
    'doc-create-paragraph': invokeFn('doc-create-paragraph', 'create.paragraph'),
    'doc-create-heading': invokeFn('doc-create-heading', 'create.heading'),
    'doc-create-table': invokeFn('doc-create-table', 'create.table'),
    'doc-create-section-break': invokeFn('doc-create-section-break', 'create.sectionBreak'),
    'doc-create-toc': invokeFn('doc-create-toc', 'create.tableOfContents'),
    'doc-create-image': invokeFn('doc-create-image', 'create.image'),
    'doc-create-content-control': invokeFn('doc-create-content-control', 'create.contentControl'),

    // ========================================================================
    // MUTATION OPERATIONS
    // ========================================================================
    'doc-insert': invokeFn('doc-insert', 'insert'),
    'doc-replace': invokeFn('doc-replace', 'replace'),
    'doc-delete': invokeFn('doc-delete', 'delete'),
    'doc-clear-content': invokeFn('doc-clear-content', 'clearContent'),
    'doc-format-range': invokeFn('doc-format-range', 'formatRange'),

    // ========================================================================
    // BLOCKS OPERATIONS
    // ========================================================================
    'doc-blocks-list': invokeFn('doc-blocks-list', 'blocks.list'),
    'doc-blocks-delete': invokeFn('doc-blocks-delete', 'blocks.delete'),
    'doc-blocks-delete-range': invokeFn('doc-blocks-delete-range', 'blocks.deleteRange'),

    // ========================================================================
    // FORMAT OPERATIONS (Text/Run)
    // ========================================================================
    'doc-format-apply': invokeFn('doc-format-apply', 'format.apply'),

    // ========================================================================
    // STYLE OPERATIONS
    // ========================================================================
    'doc-styles-apply': invokeFn('doc-styles-apply', 'styles.apply'),
    'doc-styles-paragraph-set': invokeFn('doc-styles-paragraph-set', 'styles.paragraph.setStyle'),
    'doc-styles-paragraph-clear': invokeFn('doc-styles-paragraph-clear', 'styles.paragraph.clearStyle'),

    // ========================================================================
    // PARAGRAPH FORMAT OPERATIONS
    // ========================================================================
    'doc-para-reset-formatting': invokeFn('doc-para-reset-formatting', 'format.paragraph.resetDirectFormatting'),
    'doc-para-set-alignment': invokeFn('doc-para-set-alignment', 'format.paragraph.setAlignment'),
    'doc-para-clear-alignment': invokeFn('doc-para-clear-alignment', 'format.paragraph.clearAlignment'),
    'doc-para-set-indentation': invokeFn('doc-para-set-indentation', 'format.paragraph.setIndentation'),
    'doc-para-clear-indentation': invokeFn('doc-para-clear-indentation', 'format.paragraph.clearIndentation'),
    'doc-para-set-spacing': invokeFn('doc-para-set-spacing', 'format.paragraph.setSpacing'),
    'doc-para-clear-spacing': invokeFn('doc-para-clear-spacing', 'format.paragraph.clearSpacing'),
    'doc-para-set-border': invokeFn('doc-para-set-border', 'format.paragraph.setBorder'),
    'doc-para-clear-border': invokeFn('doc-para-clear-border', 'format.paragraph.clearBorder'),
    'doc-para-set-shading': invokeFn('doc-para-set-shading', 'format.paragraph.setShading'),
    'doc-para-clear-shading': invokeFn('doc-para-clear-shading', 'format.paragraph.clearShading'),
    'doc-para-set-direction': invokeFn('doc-para-set-direction', 'format.paragraph.setDirection'),
    'doc-para-clear-direction': invokeFn('doc-para-clear-direction', 'format.paragraph.clearDirection'),
    'doc-para-set-tab-stop': invokeFn('doc-para-set-tab-stop', 'format.paragraph.setTabStop'),
    'doc-para-clear-tab-stop': invokeFn('doc-para-clear-tab-stop', 'format.paragraph.clearTabStop'),
    'doc-para-clear-all-tab-stops': invokeFn('doc-para-clear-all-tab-stops', 'format.paragraph.clearAllTabStops'),

    // ========================================================================
    // SECTION OPERATIONS
    // ========================================================================
    'doc-sections-list': invokeFn('doc-sections-list', 'sections.list'),
    'doc-sections-get': invokeFn('doc-sections-get', 'sections.get'),
    'doc-sections-set-break-type': invokeFn('doc-sections-set-break-type', 'sections.setBreakType'),
    'doc-sections-set-page-margins': invokeFn('doc-sections-set-page-margins', 'sections.setPageMargins'),
    'doc-sections-set-page-setup': invokeFn('doc-sections-set-page-setup', 'sections.setPageSetup'),
    'doc-sections-set-columns': invokeFn('doc-sections-set-columns', 'sections.setColumns'),
    'doc-sections-set-page-numbering': invokeFn('doc-sections-set-page-numbering', 'sections.setPageNumbering'),
    'doc-sections-set-page-borders': invokeFn('doc-sections-set-page-borders', 'sections.setPageBorders'),
    'doc-sections-clear-page-borders': invokeFn('doc-sections-clear-page-borders', 'sections.clearPageBorders'),

    // ========================================================================
    // LIST OPERATIONS
    // ========================================================================
    'doc-lists-list': invokeFn('doc-lists-list', 'lists.list'),
    'doc-lists-get': invokeFn('doc-lists-get', 'lists.get'),
    'doc-lists-create': invokeFn('doc-lists-create', 'lists.create'),
    'doc-lists-insert': invokeFn('doc-lists-insert', 'lists.insert'),
    'doc-lists-attach': invokeFn('doc-lists-attach', 'lists.attach'),
    'doc-lists-detach': invokeFn('doc-lists-detach', 'lists.detach'),
    'doc-lists-delete': invokeFn('doc-lists-delete', 'lists.delete'),
    'doc-lists-indent': invokeFn('doc-lists-indent', 'lists.indent'),
    'doc-lists-outdent': invokeFn('doc-lists-outdent', 'lists.outdent'),
    'doc-lists-set-level': invokeFn('doc-lists-set-level', 'lists.setLevel'),
    'doc-lists-set-type': invokeFn('doc-lists-set-type', 'lists.setType'),
    'doc-lists-apply-preset': invokeFn('doc-lists-apply-preset', 'lists.applyPreset'),
    'doc-lists-convert-to-text': invokeFn('doc-lists-convert-to-text', 'lists.convertToText'),

    // ========================================================================
    // TABLE OPERATIONS
    // ========================================================================
    'doc-tables-get': invokeFn('doc-tables-get', 'tables.get'),
    'doc-tables-get-cells': invokeFn('doc-tables-get-cells', 'tables.getCells'),
    'doc-tables-delete': invokeFn('doc-tables-delete', 'tables.delete'),
    'doc-tables-clear-contents': invokeFn('doc-tables-clear-contents', 'tables.clearContents'),
    'doc-tables-insert-row': invokeFn('doc-tables-insert-row', 'tables.insertRow'),
    'doc-tables-delete-row': invokeFn('doc-tables-delete-row', 'tables.deleteRow'),
    'doc-tables-insert-column': invokeFn('doc-tables-insert-column', 'tables.insertColumn'),
    'doc-tables-delete-column': invokeFn('doc-tables-delete-column', 'tables.deleteColumn'),
    'doc-tables-insert-cell': invokeFn('doc-tables-insert-cell', 'tables.insertCell'),
    'doc-tables-delete-cell': invokeFn('doc-tables-delete-cell', 'tables.deleteCell'),
    'doc-tables-merge-cells': invokeFn('doc-tables-merge-cells', 'tables.mergeCells'),
    'doc-tables-unmerge-cells': invokeFn('doc-tables-unmerge-cells', 'tables.unmergeCells'),
    'doc-tables-split-cell': invokeFn('doc-tables-split-cell', 'tables.splitCell'),
    'doc-tables-set-cell-text': invokeFn('doc-tables-set-cell-text', 'tables.setCellText'),
    'doc-tables-set-cell-properties': invokeFn('doc-tables-set-cell-properties', 'tables.setCellProperties'),
    'doc-tables-set-row-height': invokeFn('doc-tables-set-row-height', 'tables.setRowHeight'),
    'doc-tables-set-column-width': invokeFn('doc-tables-set-column-width', 'tables.setColumnWidth'),
    'doc-tables-set-style': invokeFn('doc-tables-set-style', 'tables.setStyle'),
    'doc-tables-clear-style': invokeFn('doc-tables-clear-style', 'tables.clearStyle'),
    'doc-tables-set-border': invokeFn('doc-tables-set-border', 'tables.setBorder'),
    'doc-tables-clear-border': invokeFn('doc-tables-clear-border', 'tables.clearBorder'),
    'doc-tables-set-shading': invokeFn('doc-tables-set-shading', 'tables.setShading'),
    'doc-tables-clear-shading': invokeFn('doc-tables-clear-shading', 'tables.clearShading'),
    'doc-tables-apply-preset': invokeFn('doc-tables-apply-preset', 'tables.applyPreset'),
    'doc-tables-sort': invokeFn('doc-tables-sort', 'tables.sort'),
    'doc-tables-convert-from-text': invokeFn('doc-tables-convert-from-text', 'tables.convertFromText'),
    'doc-tables-convert-to-text': invokeFn('doc-tables-convert-to-text', 'tables.convertToText'),

    // ========================================================================
    // IMAGE OPERATIONS
    // ========================================================================
    'doc-images-list': invokeFn('doc-images-list', 'images.list'),
    'doc-images-get': invokeFn('doc-images-get', 'images.get'),
    'doc-images-delete': invokeFn('doc-images-delete', 'images.delete'),
    'doc-images-move': invokeFn('doc-images-move', 'images.move'),
    'doc-images-set-size': invokeFn('doc-images-set-size', 'images.setSize'),
    'doc-images-scale': invokeFn('doc-images-scale', 'images.scale'),
    'doc-images-rotate': invokeFn('doc-images-rotate', 'images.rotate'),
    'doc-images-flip': invokeFn('doc-images-flip', 'images.flip'),
    'doc-images-crop': invokeFn('doc-images-crop', 'images.crop'),
    'doc-images-reset-crop': invokeFn('doc-images-reset-crop', 'images.resetCrop'),
    'doc-images-set-wrap-type': invokeFn('doc-images-set-wrap-type', 'images.setWrapType'),
    'doc-images-set-position': invokeFn('doc-images-set-position', 'images.setPosition'),
    'doc-images-set-alt-text': invokeFn('doc-images-set-alt-text', 'images.setAltText'),
    'doc-images-replace-source': invokeFn('doc-images-replace-source', 'images.replaceSource'),
    'doc-images-convert-to-inline': invokeFn('doc-images-convert-to-inline', 'images.convertToInline'),
    'doc-images-convert-to-floating': invokeFn('doc-images-convert-to-floating', 'images.convertToFloating'),

    // ========================================================================
    // HYPERLINK OPERATIONS
    // ========================================================================
    'doc-hyperlinks-list': invokeFn('doc-hyperlinks-list', 'hyperlinks.list'),
    'doc-hyperlinks-get': invokeFn('doc-hyperlinks-get', 'hyperlinks.get'),
    'doc-hyperlinks-insert': invokeFn('doc-hyperlinks-insert', 'hyperlinks.insert'),
    'doc-hyperlinks-wrap': invokeFn('doc-hyperlinks-wrap', 'hyperlinks.wrap'),
    'doc-hyperlinks-patch': invokeFn('doc-hyperlinks-patch', 'hyperlinks.patch'),
    'doc-hyperlinks-remove': invokeFn('doc-hyperlinks-remove', 'hyperlinks.remove'),

    // ========================================================================
    // BOOKMARK OPERATIONS
    // ========================================================================
    'doc-bookmarks-list': invokeFn('doc-bookmarks-list', 'bookmarks.list'),
    'doc-bookmarks-get': invokeFn('doc-bookmarks-get', 'bookmarks.get'),
    'doc-bookmarks-insert': invokeFn('doc-bookmarks-insert', 'bookmarks.insert'),
    'doc-bookmarks-rename': invokeFn('doc-bookmarks-rename', 'bookmarks.rename'),
    'doc-bookmarks-remove': invokeFn('doc-bookmarks-remove', 'bookmarks.remove'),

    // ========================================================================
    // COMMENT OPERATIONS
    // ========================================================================
    'doc-comments-list': invokeFn('doc-comments-list', 'comments.list'),
    'doc-comments-get': invokeFn('doc-comments-get', 'comments.get'),
    'doc-comments-create': invokeFn('doc-comments-create', 'comments.create'),
    'doc-comments-patch': invokeFn('doc-comments-patch', 'comments.patch'),
    'doc-comments-delete': invokeFn('doc-comments-delete', 'comments.delete'),

    // ========================================================================
    // TRACK CHANGES OPERATIONS
    // ========================================================================
    'doc-track-changes-list': invokeFn('doc-track-changes-list', 'trackChanges.list'),
    'doc-track-changes-get': invokeFn('doc-track-changes-get', 'trackChanges.get'),
    'doc-track-changes-decide': invokeFn('doc-track-changes-decide', 'trackChanges.decide'),

    // ========================================================================
    // CONTENT CONTROL (SDT) OPERATIONS
    // ========================================================================
    'doc-cc-list': invokeFn('doc-cc-list', 'contentControls.list'),
    'doc-cc-get': invokeFn('doc-cc-get', 'contentControls.get'),
    'doc-cc-list-in-range': invokeFn('doc-cc-list-in-range', 'contentControls.listInRange'),
    'doc-cc-select-by-tag': invokeFn('doc-cc-select-by-tag', 'contentControls.selectByTag'),
    'doc-cc-select-by-title': invokeFn('doc-cc-select-by-title', 'contentControls.selectByTitle'),
    'doc-cc-wrap': invokeFn('doc-cc-wrap', 'contentControls.wrap'),
    'doc-cc-unwrap': invokeFn('doc-cc-unwrap', 'contentControls.unwrap'),
    'doc-cc-delete': invokeFn('doc-cc-delete', 'contentControls.delete'),
    'doc-cc-patch': invokeFn('doc-cc-patch', 'contentControls.patch'),
    'doc-cc-get-content': invokeFn('doc-cc-get-content', 'contentControls.getContent'),
    'doc-cc-replace-content': invokeFn('doc-cc-replace-content', 'contentControls.replaceContent'),
    'doc-cc-clear-content': invokeFn('doc-cc-clear-content', 'contentControls.clearContent'),
    'doc-cc-set-lock-mode': invokeFn('doc-cc-set-lock-mode', 'contentControls.setLockMode'),
    'doc-cc-set-type': invokeFn('doc-cc-set-type', 'contentControls.setType'),
    'doc-cc-text-set-value': invokeFn('doc-cc-text-set-value', 'contentControls.text.setValue'),
    'doc-cc-text-clear-value': invokeFn('doc-cc-text-clear-value', 'contentControls.text.clearValue'),
    'doc-cc-date-set-value': invokeFn('doc-cc-date-set-value', 'contentControls.date.setValue'),
    'doc-cc-date-clear-value': invokeFn('doc-cc-date-clear-value', 'contentControls.date.clearValue'),
    'doc-cc-checkbox-get-state': invokeFn('doc-cc-checkbox-get-state', 'contentControls.checkbox.getState'),
    'doc-cc-checkbox-set-state': invokeFn('doc-cc-checkbox-set-state', 'contentControls.checkbox.setState'),
    'doc-cc-checkbox-toggle': invokeFn('doc-cc-checkbox-toggle', 'contentControls.checkbox.toggle'),
    'doc-cc-choice-get-items': invokeFn('doc-cc-choice-get-items', 'contentControls.choiceList.getItems'),
    'doc-cc-choice-set-items': invokeFn('doc-cc-choice-set-items', 'contentControls.choiceList.setItems'),
    'doc-cc-choice-set-selected': invokeFn('doc-cc-choice-set-selected', 'contentControls.choiceList.setSelected'),

    // ========================================================================
    // HEADER/FOOTER OPERATIONS
    // ========================================================================
    'doc-hf-list': invokeFn('doc-hf-list', 'headerFooters.list'),
    'doc-hf-get': invokeFn('doc-hf-get', 'headerFooters.get'),
    'doc-hf-resolve': invokeFn('doc-hf-resolve', 'headerFooters.resolve'),
    'doc-hf-parts-list': invokeFn('doc-hf-parts-list', 'headerFooters.parts.list'),
    'doc-hf-parts-create': invokeFn('doc-hf-parts-create', 'headerFooters.parts.create'),
    'doc-hf-parts-delete': invokeFn('doc-hf-parts-delete', 'headerFooters.parts.delete'),

    // ========================================================================
    // FOOTNOTE OPERATIONS
    // ========================================================================
    'doc-footnotes-list': invokeFn('doc-footnotes-list', 'footnotes.list'),
    'doc-footnotes-get': invokeFn('doc-footnotes-get', 'footnotes.get'),
    'doc-footnotes-insert': invokeFn('doc-footnotes-insert', 'footnotes.insert'),
    'doc-footnotes-update': invokeFn('doc-footnotes-update', 'footnotes.update'),
    'doc-footnotes-remove': invokeFn('doc-footnotes-remove', 'footnotes.remove'),

    // ========================================================================
    // TABLE OF CONTENTS OPERATIONS
    // ========================================================================
    'doc-toc-list': invokeFn('doc-toc-list', 'toc.list'),
    'doc-toc-get': invokeFn('doc-toc-get', 'toc.get'),
    'doc-toc-configure': invokeFn('doc-toc-configure', 'toc.configure'),
    'doc-toc-update': invokeFn('doc-toc-update', 'toc.update'),
    'doc-toc-remove': invokeFn('doc-toc-remove', 'toc.remove'),

    // ========================================================================
    // FIELD OPERATIONS
    // ========================================================================
    'doc-fields-list': invokeFn('doc-fields-list', 'fields.list'),
    'doc-fields-get': invokeFn('doc-fields-get', 'fields.get'),
    'doc-fields-insert': invokeFn('doc-fields-insert', 'fields.insert'),
    'doc-fields-rebuild': invokeFn('doc-fields-rebuild', 'fields.rebuild'),
    'doc-fields-remove': invokeFn('doc-fields-remove', 'fields.remove'),

    // ========================================================================
    // CROSS-REFERENCE OPERATIONS
    // ========================================================================
    'doc-cross-refs-list': invokeFn('doc-cross-refs-list', 'crossRefs.list'),
    'doc-cross-refs-get': invokeFn('doc-cross-refs-get', 'crossRefs.get'),
    'doc-cross-refs-insert': invokeFn('doc-cross-refs-insert', 'crossRefs.insert'),
    'doc-cross-refs-rebuild': invokeFn('doc-cross-refs-rebuild', 'crossRefs.rebuild'),
    'doc-cross-refs-remove': invokeFn('doc-cross-refs-remove', 'crossRefs.remove'),

    // ========================================================================
    // CITATION OPERATIONS
    // ========================================================================
    'doc-citations-list': invokeFn('doc-citations-list', 'citations.list'),
    'doc-citations-get': invokeFn('doc-citations-get', 'citations.get'),
    'doc-citations-insert': invokeFn('doc-citations-insert', 'citations.insert'),
    'doc-citations-update': invokeFn('doc-citations-update', 'citations.update'),
    'doc-citations-remove': invokeFn('doc-citations-remove', 'citations.remove'),
    'doc-citations-sources-list': invokeFn('doc-citations-sources-list', 'citations.sources.list'),
    'doc-citations-sources-get': invokeFn('doc-citations-sources-get', 'citations.sources.get'),
    'doc-citations-sources-insert': invokeFn('doc-citations-sources-insert', 'citations.sources.insert'),
    'doc-citations-bib-insert': invokeFn('doc-citations-bib-insert', 'citations.bibliography.insert'),
    'doc-citations-bib-rebuild': invokeFn('doc-citations-bib-rebuild', 'citations.bibliography.rebuild'),

    // ========================================================================
    // HISTORY OPERATIONS
    // ========================================================================
    'doc-history-get': invokeFn('doc-history-get', 'history.get'),
    'doc-undo': invokeFn('doc-undo', 'history.undo'),
    'doc-redo': invokeFn('doc-redo', 'history.redo'),

    // ========================================================================
    // DIFF OPERATIONS
    // ========================================================================
    'doc-diff-capture': invokeFn('doc-diff-capture', 'diff.capture'),
    'doc-diff-compare': invokeFn('doc-diff-compare', 'diff.compare'),
    'doc-diff-apply': invokeFn('doc-diff-apply', 'diff.apply'),

    // ========================================================================
    // PROTECTION OPERATIONS
    // ========================================================================
    'doc-protection-get': invokeFn('doc-protection-get', 'protection.get'),
    'doc-protection-set': invokeFn('doc-protection-set', 'protection.setEditingRestriction'),
    'doc-protection-clear': invokeFn('doc-protection-clear', 'protection.clearEditingRestriction'),

    // ========================================================================
    // QUERY/SELECTION OPERATIONS
    // ========================================================================
    'doc-query-match': invokeFn('doc-query-match', 'query.match'),
    'doc-ranges-resolve': invokeFn('doc-ranges-resolve', 'ranges.resolve'),
    'doc-selection-current': invokeFn('doc-selection-current', 'selection.current'),

    // ========================================================================
    // METADATA OPERATIONS
    // ========================================================================
    'doc-metadata-list': invokeFn('doc-metadata-list', 'metadata.list'),
    'doc-metadata-get': invokeFn('doc-metadata-get', 'metadata.get'),
    'doc-metadata-attach': invokeFn('doc-metadata-attach', 'metadata.attach'),
    'doc-metadata-update': invokeFn('doc-metadata-update', 'metadata.update'),
    'doc-metadata-remove': invokeFn('doc-metadata-remove', 'metadata.remove'),

    // ========================================================================
    // RESET
    // ========================================================================
    'doc-reset': docFn('doc-reset', 'doc/reset'),

    // Legacy aliases for backward compatibility
    'doc-sdt-list': invokeFn('doc-sdt-list', 'contentControls.list'),
    'doc-sdt-get': invokeFn('doc-sdt-get', 'contentControls.get'),
    'doc-comments-add': invokeFn('doc-comments-add', 'comments.create'),
    'doc-format-bold': invokeFn('doc-format-bold', 'format.apply'),
    'doc-format-italic': invokeFn('doc-format-italic', 'format.apply'),
    'doc-format-underline': invokeFn('doc-format-underline', 'format.apply'),
    'doc-format-strike': invokeFn('doc-format-strike', 'format.apply'),
    'doc-format-highlight': invokeFn('doc-format-highlight', 'format.apply'),
    'doc-format-color': invokeFn('doc-format-color', 'format.apply'),
    'doc-format-font-size': invokeFn('doc-format-font-size', 'format.apply'),
    'doc-format-font-family': invokeFn('doc-format-font-family', 'format.apply'),
  };
}

// ============================================================================
// STANDARD LIBRARY
// ============================================================================

function createStdLib(outputs: string[]): Record<string, LispValue> {
  const fn = (name: string, f: BuiltinFn): LispValue => ({ type: 'function', name, fn: f });

  return {
    // Arithmetic
    '+': fn('+', (args) => ({ type: 'number', value: args.reduce((a, b) => a + (b.type === 'number' ? b.value : 0), 0) })),
    '-': fn('-', (args) => {
      if (args.length === 1 && args[0].type === 'number') return { type: 'number', value: -args[0].value };
      const first = args[0]?.type === 'number' ? args[0].value : 0;
      return { type: 'number', value: args.slice(1).reduce((a, b) => a - (b.type === 'number' ? b.value : 0), first) };
    }),
    '*': fn('*', (args) => ({ type: 'number', value: args.reduce((a, b) => a * (b.type === 'number' ? b.value : 1), 1) })),
    '/': fn('/', (args) => {
      const first = args[0]?.type === 'number' ? args[0].value : 0;
      return { type: 'number', value: args.slice(1).reduce((a, b) => a / (b.type === 'number' ? b.value : 1), first) };
    }),
    'mod': fn('mod', (args) => {
      if (args[0].type !== 'number' || args[1].type !== 'number') throw new Error('mod requires numbers');
      return { type: 'number', value: args[0].value % args[1].value };
    }),
    'inc': fn('inc', (args) => {
      if (args[0].type !== 'number') throw new Error('inc requires a number');
      return { type: 'number', value: args[0].value + 1 };
    }),
    'dec': fn('dec', (args) => {
      if (args[0].type !== 'number') throw new Error('dec requires a number');
      return { type: 'number', value: args[0].value - 1 };
    }),

    // Comparison
    '=': fn('=', (args) => ({ type: 'bool', value: toJS(args[0]) === toJS(args[1]) })),
    'not=': fn('not=', (args) => ({ type: 'bool', value: toJS(args[0]) !== toJS(args[1]) })),
    '<': fn('<', (args) => ({ type: 'bool', value: (args[0] as any).value < (args[1] as any).value })),
    '>': fn('>', (args) => ({ type: 'bool', value: (args[0] as any).value > (args[1] as any).value })),
    '<=': fn('<=', (args) => ({ type: 'bool', value: (args[0] as any).value <= (args[1] as any).value })),
    '>=': fn('>=', (args) => ({ type: 'bool', value: (args[0] as any).value >= (args[1] as any).value })),
    'not': fn('not', (args) => ({ type: 'bool', value: !isTruthy(args[0]) })),

    // Collections
    'list': fn('list', (args) => ({ type: 'list', value: args })),
    'vector': fn('vector', (args) => ({ type: 'vector', value: args })),
    'vec': fn('vec', (args) => {
      const coll = args[0];
      if (coll.type === 'list' || coll.type === 'vector') return { type: 'vector', value: coll.value };
      return { type: 'vector', value: [] };
    }),
    'hash-map': fn('hash-map', (args) => {
      const map = new Map<string, LispValue>();
      for (let i = 0; i < args.length; i += 2) {
        const key = args[i];
        const val = args[i + 1];
        const keyStr = key.type === 'keyword' ? key.value : key.type === 'string' ? key.value : print(key);
        map.set(keyStr, val);
      }
      return { type: 'map', value: map };
    }),

    'first': fn('first', (args) => {
      const coll = args[0];
      if (coll.type === 'list' || coll.type === 'vector') return coll.value[0] ?? { type: 'nil' };
      return { type: 'nil' };
    }),
    'rest': fn('rest', (args) => {
      const coll = args[0];
      if (coll.type === 'list' || coll.type === 'vector') return { type: 'list', value: coll.value.slice(1) };
      return { type: 'list', value: [] };
    }),
    'next': fn('next', (args) => {
      const coll = args[0];
      if (coll.type === 'list' || coll.type === 'vector') {
        const rest = coll.value.slice(1);
        return rest.length > 0 ? { type: 'list', value: rest } : { type: 'nil' };
      }
      return { type: 'nil' };
    }),
    'cons': fn('cons', (args) => {
      const item = args[0];
      const coll = args[1];
      if (coll.type === 'list' || coll.type === 'vector') return { type: 'list', value: [item, ...coll.value] };
      return { type: 'list', value: [item] };
    }),
    'conj': fn('conj', (args) => {
      const coll = args[0];
      const items = args.slice(1);
      if (coll.type === 'vector') return { type: 'vector', value: [...coll.value, ...items] };
      if (coll.type === 'list') return { type: 'list', value: [...items.reverse(), ...coll.value] };
      return coll;
    }),
    'concat': fn('concat', (args) => {
      const result: LispValue[] = [];
      for (const arg of args) {
        if (arg.type === 'list' || arg.type === 'vector') result.push(...arg.value);
      }
      return { type: 'list', value: result };
    }),
    'count': fn('count', (args) => {
      const coll = args[0];
      if (coll.type === 'list' || coll.type === 'vector') return { type: 'number', value: coll.value.length };
      if (coll.type === 'string') return { type: 'number', value: coll.value.length };
      if (coll.type === 'map') return { type: 'number', value: coll.value.size };
      if (coll.type === 'nil') return { type: 'number', value: 0 };
      return { type: 'number', value: 0 };
    }),
    'empty?': fn('empty?', (args) => {
      const coll = args[0];
      if (coll.type === 'nil') return { type: 'bool', value: true };
      if (coll.type === 'list' || coll.type === 'vector') return { type: 'bool', value: coll.value.length === 0 };
      if (coll.type === 'map') return { type: 'bool', value: coll.value.size === 0 };
      if (coll.type === 'string') return { type: 'bool', value: coll.value.length === 0 };
      return { type: 'bool', value: true };
    }),
    'nth': fn('nth', (args) => {
      const coll = args[0];
      const idx = args[1];
      if (idx.type !== 'number') throw new Error('nth requires a number index');
      if (coll.type === 'list' || coll.type === 'vector') {
        return coll.value[idx.value] ?? (args[2] ?? { type: 'nil' });
      }
      return args[2] ?? { type: 'nil' };
    }),
    'get': fn('get', (args) => {
      const coll = args[0];
      const key = args[1];
      if (coll.type === 'map') {
        const keyStr = key.type === 'keyword' ? key.value : key.type === 'string' ? key.value : print(key);
        return coll.value.get(keyStr) ?? (args[2] ?? { type: 'nil' });
      }
      if (coll.type === 'object') {
        const keyStr = key.type === 'keyword' ? key.value : key.type === 'string' ? key.value : print(key);
        return toLispValue(coll.value[keyStr]) ?? (args[2] ?? { type: 'nil' });
      }
      if (coll.type === 'vector' && key.type === 'number') {
        return coll.value[key.value] ?? (args[2] ?? { type: 'nil' });
      }
      return args[2] ?? { type: 'nil' };
    }),
    'assoc': fn('assoc', (args) => {
      const coll = args[0];
      if (coll.type === 'map') {
        const newMap = new Map(coll.value);
        for (let i = 1; i < args.length; i += 2) {
          const key = args[i];
          const val = args[i + 1];
          const keyStr = key.type === 'keyword' ? key.value : key.type === 'string' ? key.value : print(key);
          newMap.set(keyStr, val);
        }
        return { type: 'map', value: newMap };
      }
      return coll;
    }),
    'keys': fn('keys', (args) => {
      const coll = args[0];
      if (coll.type === 'map') {
        const keys: LispValue[] = [];
        coll.value.forEach((_, k) => keys.push({ type: 'keyword', value: k }));
        return { type: 'list', value: keys };
      }
      if (coll.type === 'object') {
        return { type: 'list', value: Object.keys(coll.value).map(k => ({ type: 'string', value: k })) };
      }
      return { type: 'nil' };
    }),
    'vals': fn('vals', (args) => {
      const coll = args[0];
      if (coll.type === 'map') {
        const vals: LispValue[] = [];
        coll.value.forEach(v => vals.push(v));
        return { type: 'list', value: vals };
      }
      if (coll.type === 'object') {
        return { type: 'list', value: Object.values(coll.value).map(toLispValue) };
      }
      return { type: 'nil' };
    }),

    // Higher-order
    'map': fn('map', async (args, env) => {
      const f = args[0];
      const coll = args[1];
      if (coll.type !== 'list' && coll.type !== 'vector') return { type: 'list', value: [] };
      const results: LispValue[] = [];
      for (const item of coll.value) {
        const call: LispValue = { type: 'list', value: [f, { type: 'list', value: [{ type: 'symbol', value: 'quote' }, item] }] };
        results.push(await evaluate(call, env));
      }
      return { type: 'list', value: results };
    }),
    'filter': fn('filter', async (args, env) => {
      const f = args[0];
      const coll = args[1];
      if (coll.type !== 'list' && coll.type !== 'vector') return { type: 'list', value: [] };
      const results: LispValue[] = [];
      for (const item of coll.value) {
        const call: LispValue = { type: 'list', value: [f, { type: 'list', value: [{ type: 'symbol', value: 'quote' }, item] }] };
        const result = await evaluate(call, env);
        if (isTruthy(result)) results.push(item);
      }
      return { type: 'list', value: results };
    }),
    'reduce': fn('reduce', async (args, env) => {
      const f = args[0];
      let acc: LispValue;
      let coll: LispValue;
      if (args.length === 3) {
        acc = args[1];
        coll = args[2];
      } else {
        coll = args[1];
        if (coll.type !== 'list' && coll.type !== 'vector') return { type: 'nil' };
        if (coll.value.length === 0) return { type: 'nil' };
        acc = coll.value[0];
        coll = { type: coll.type, value: coll.value.slice(1) };
      }
      if (coll.type !== 'list' && coll.type !== 'vector') return acc;
      for (const item of coll.value) {
        const call: LispValue = { type: 'list', value: [f, acc, item] };
        acc = await evaluate(call, env);
      }
      return acc;
    }),

    // Type predicates
    'nil?': fn('nil?', (args) => ({ type: 'bool', value: args[0].type === 'nil' })),
    'some?': fn('some?', (args) => ({ type: 'bool', value: args[0].type !== 'nil' })),
    'list?': fn('list?', (args) => ({ type: 'bool', value: args[0].type === 'list' })),
    'vector?': fn('vector?', (args) => ({ type: 'bool', value: args[0].type === 'vector' })),
    'map?': fn('map?', (args) => ({ type: 'bool', value: args[0].type === 'map' })),
    'number?': fn('number?', (args) => ({ type: 'bool', value: args[0].type === 'number' })),
    'string?': fn('string?', (args) => ({ type: 'bool', value: args[0].type === 'string' })),
    'keyword?': fn('keyword?', (args) => ({ type: 'bool', value: args[0].type === 'keyword' })),
    'fn?': fn('fn?', (args) => ({ type: 'bool', value: args[0].type === 'function' || args[0].type === 'lambda' })),
    'coll?': fn('coll?', (args) => ({ type: 'bool', value: ['list', 'vector', 'map'].includes(args[0].type) })),
    'seq?': fn('seq?', (args) => ({ type: 'bool', value: args[0].type === 'list' || args[0].type === 'vector' })),

    // Strings
    'str': fn('str', (args) => ({
      type: 'string',
      value: args.map(a => a.type === 'string' ? a.value : a.type === 'nil' ? '' : print(a).replace(/^"|"$/g, '')).join('')
    })),
    'subs': fn('subs', (args) => {
      if (args[0].type !== 'string') throw new Error('subs requires a string');
      const start = args[1]?.type === 'number' ? args[1].value : 0;
      const end = args[2]?.type === 'number' ? args[2].value : undefined;
      return { type: 'string', value: args[0].value.substring(start, end) };
    }),
    'split': fn('split', (args) => {
      if (args[0].type !== 'string') throw new Error('split requires a string');
      const sep = args[1]?.type === 'string' ? args[1].value : ' ';
      return { type: 'vector', value: args[0].value.split(sep).map(s => ({ type: 'string', value: s } as LispValue)) };
    }),
    'join': fn('join', (args) => {
      const sep = args.length > 1 && args[0].type === 'string' ? args[0].value : '';
      const coll = args.length > 1 ? args[1] : args[0];
      if (coll.type !== 'list' && coll.type !== 'vector') return { type: 'string', value: '' };
      return { type: 'string', value: coll.value.map(v => v.type === 'string' ? v.value : print(v)).join(sep) };
    }),
    'upper-case': fn('upper-case', (args) => {
      if (args[0].type !== 'string') return args[0];
      return { type: 'string', value: args[0].value.toUpperCase() };
    }),
    'lower-case': fn('lower-case', (args) => {
      if (args[0].type !== 'string') return args[0];
      return { type: 'string', value: args[0].value.toLowerCase() };
    }),
    'trim': fn('trim', (args) => {
      if (args[0].type !== 'string') return args[0];
      return { type: 'string', value: args[0].value.trim() };
    }),

    // I/O
    'println': fn('println', (args) => {
      const output = args.map(a => a.type === 'string' ? a.value : print(a)).join(' ');
      outputs.push(output);
      return { type: 'nil' };
    }),
    'prn': fn('prn', (args) => {
      const output = args.map(print).join(' ');
      outputs.push(output);
      return { type: 'nil' };
    }),

    // Help
    'help': fn('help', (args) => {
      if (args.length === 0) {
        outputs.push(`SuperDoc Clojure REPL

Doc API:
  (doc-open)                          ; blank document
  (doc-open :path "file.docx")        ; load file
  (doc-info)                          ; document stats
  (doc-get-text)                      ; plain text
  (doc-create-paragraph :text "Hi")   ; add paragraph
  (doc-create-heading :text "Title" :level 1)

Clojure:
  (def x 42)                          ; define var
  (defn f [x] (+ x 1))                ; define function
  (let [x 1 y 2] (+ x y))             ; local bindings
  (-> x (f) (g))                      ; thread first
  (->> x (f) (g))                     ; thread last

Use (help 'doc) for full API reference.`);
        return { type: 'nil' };
      }

      const arg = args[0];
      if (arg.type === 'function') {
        const name = arg.name;
        if (name.startsWith('doc-')) {
          outputs.push(`${name}\n\nCall the ${name} operation on the document.\nUse keyword arguments: (${name} :param value ...)`);
        } else {
          outputs.push(`${name} - builtin function`);
        }
      } else if (arg.type === 'symbol' && (arg.value === 'doc' || arg.value === 'Doc')) {
        outputs.push(`Doc API Reference (use (help 'doc-<category>) for details)

CORE: doc-info, doc-get, doc-get-text, doc-get-markdown, doc-get-html, doc-find, doc-capabilities, doc-extract

CREATE: doc-create-paragraph, doc-create-heading, doc-create-table, doc-create-section-break, doc-create-toc, doc-create-image, doc-create-content-control

MUTATE: doc-insert, doc-replace, doc-delete, doc-clear-content, doc-format-range, doc-format-apply

BLOCKS: doc-blocks-list, doc-blocks-delete, doc-blocks-delete-range

STYLES: doc-styles-apply, doc-styles-paragraph-set, doc-styles-paragraph-clear

PARAGRAPHS: doc-para-set-alignment, doc-para-set-indentation, doc-para-set-spacing, doc-para-set-border, doc-para-set-shading, doc-para-set-direction, doc-para-set-tab-stop

SECTIONS: doc-sections-list, doc-sections-get, doc-sections-set-break-type, doc-sections-set-page-margins, doc-sections-set-columns, doc-sections-set-page-numbering

LISTS: doc-lists-list, doc-lists-get, doc-lists-create, doc-lists-insert, doc-lists-attach, doc-lists-detach, doc-lists-indent, doc-lists-outdent, doc-lists-set-level, doc-lists-apply-preset

TABLES: doc-tables-get, doc-tables-get-cells, doc-tables-delete, doc-tables-insert-row, doc-tables-delete-row, doc-tables-insert-column, doc-tables-delete-column, doc-tables-merge-cells, doc-tables-set-cell-text, doc-tables-set-style, doc-tables-apply-preset, doc-tables-sort

IMAGES: doc-images-list, doc-images-get, doc-images-delete, doc-images-set-size, doc-images-scale, doc-images-rotate, doc-images-crop, doc-images-set-wrap-type, doc-images-set-position, doc-images-set-alt-text

HYPERLINKS: doc-hyperlinks-list, doc-hyperlinks-get, doc-hyperlinks-insert, doc-hyperlinks-wrap, doc-hyperlinks-patch, doc-hyperlinks-remove

BOOKMARKS: doc-bookmarks-list, doc-bookmarks-get, doc-bookmarks-insert, doc-bookmarks-rename, doc-bookmarks-remove

COMMENTS: doc-comments-list, doc-comments-get, doc-comments-create, doc-comments-patch, doc-comments-delete

TRACK CHANGES: doc-track-changes-list, doc-track-changes-get, doc-track-changes-decide

CONTENT CONTROLS: doc-cc-list, doc-cc-get, doc-cc-select-by-tag, doc-cc-select-by-title, doc-cc-wrap, doc-cc-unwrap, doc-cc-delete, doc-cc-patch, doc-cc-get-content, doc-cc-replace-content, doc-cc-clear-content, doc-cc-text-set-value, doc-cc-checkbox-toggle, doc-cc-choice-set-selected

HEADERS/FOOTERS: doc-hf-list, doc-hf-get, doc-hf-resolve, doc-hf-parts-list, doc-hf-parts-create, doc-hf-parts-delete

FOOTNOTES: doc-footnotes-list, doc-footnotes-get, doc-footnotes-insert, doc-footnotes-update, doc-footnotes-remove

TOC: doc-toc-list, doc-toc-get, doc-toc-configure, doc-toc-update, doc-toc-remove

FIELDS: doc-fields-list, doc-fields-get, doc-fields-insert, doc-fields-rebuild, doc-fields-remove

CROSS-REFS: doc-cross-refs-list, doc-cross-refs-get, doc-cross-refs-insert, doc-cross-refs-rebuild

CITATIONS: doc-citations-list, doc-citations-insert, doc-citations-sources-list, doc-citations-bib-insert, doc-citations-bib-rebuild

HISTORY: doc-history-get, doc-undo, doc-redo

DIFF: doc-diff-capture, doc-diff-compare, doc-diff-apply

PROTECTION: doc-protection-get, doc-protection-set, doc-protection-clear

QUERY: doc-query-match, doc-ranges-resolve, doc-selection-current

METADATA: doc-metadata-list, doc-metadata-get, doc-metadata-attach, doc-metadata-update, doc-metadata-remove`);
      } else {
        outputs.push(`No help available for: ${print(arg)}`);
      }
      return { type: 'nil' };
    }),

    // Reset
    'reset': fn('reset', async () => {
      await apiCall('doc/reset');
      return toLispValue({ message: 'Session reset' });
    }),

    // Identity and constantly
    'identity': fn('identity', (args) => args[0] ?? { type: 'nil' }),
    'constantly': fn('constantly', (args) => {
      const val = args[0];
      return { type: 'function', name: 'constantly', fn: () => val };
    }),

    // Range
    'range': fn('range', (args) => {
      let start = 0, end = 0, step = 1;
      if (args.length === 1 && args[0].type === 'number') {
        end = args[0].value;
      } else if (args.length === 2 && args[0].type === 'number' && args[1].type === 'number') {
        start = args[0].value;
        end = args[1].value;
      } else if (args.length >= 3 && args[0].type === 'number' && args[1].type === 'number' && args[2].type === 'number') {
        start = args[0].value;
        end = args[1].value;
        step = args[2].value;
      }
      const result: LispValue[] = [];
      if (step > 0) {
        for (let i = start; i < end; i += step) result.push({ type: 'number', value: i });
      } else if (step < 0) {
        for (let i = start; i > end; i += step) result.push({ type: 'number', value: i });
      }
      return { type: 'list', value: result };
    }),

    // Apply
    'apply': fn('apply', async (args, env) => {
      const f = args[0];
      const lastArg = args[args.length - 1];
      const middleArgs = args.slice(1, -1);
      let allArgs: LispValue[] = [...middleArgs];
      if (lastArg.type === 'list' || lastArg.type === 'vector') {
        allArgs = [...allArgs, ...lastArg.value];
      }
      const call: LispValue = { type: 'list', value: [f, ...allArgs] };
      return evaluate(call, env);
    }),
  };
}

// ============================================================================
// PUBLIC API
// ============================================================================

export interface LispResult {
  result: unknown;
  outputs: Array<{ kind: 'stdout'; text: string } | { kind: 'result'; value: unknown; type: string }>;
  error?: string;
}

export async function executeLisp(code: string, persistentEnv?: Env): Promise<LispResult> {
  const outputs: string[] = [];
  const env: Env = persistentEnv ?? new Map();

  // Initialize environment with stdlib and Doc API
  if (!env.has('+')) {
    const stdlib = createStdLib(outputs);
    const docApi = createDocApi();
    for (const [name, val] of Object.entries(stdlib)) {
      env.set(name, val);
    }
    for (const [name, val] of Object.entries(docApi)) {
      env.set(name, val);
    }
  } else {
    // Update stdout capture for this execution
    const stdlib = createStdLib(outputs);
    env.set('println', stdlib['println']);
    env.set('prn', stdlib['prn']);
    env.set('help', stdlib['help']);
  }

  try {
    const tokens = tokenize(code);
    const exprs = parse(tokens);

    let lastResult: LispValue = { type: 'nil' };
    for (const expr of exprs) {
      lastResult = await evaluate(expr, env);
    }

    const resultOutputs: LispResult['outputs'] = outputs.map(text => ({ kind: 'stdout', text }));

    // Only add result if it's not nil
    if (lastResult.type !== 'nil') {
      resultOutputs.push({
        kind: 'result',
        value: toJS(lastResult),
        type: lastResult.type,
      });
    }

    return {
      result: toJS(lastResult),
      outputs: resultOutputs,
    };
  } catch (err) {
    return {
      result: null,
      outputs: outputs.map(text => ({ kind: 'stdout', text })),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// Create a persistent environment for REPL use
export function createLispEnv(): Env {
  return new Map();
}
