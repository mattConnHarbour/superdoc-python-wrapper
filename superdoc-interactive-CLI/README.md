# SuperDoc Interactive CLI

A REPL for editing Word documents using the SuperDoc library. Supports both Python and Clojure.

## Prerequisites

- Node.js 18+
- Python 3.8+ (for Python mode)
- pnpm (or npm)

## Setup

```bash
# Install dependencies
pnpm install

# Start the dev server
pnpm dev
```

This starts:
- Vite dev server at http://localhost:5173
- Express backend at http://localhost:3002

## Usage

Open http://localhost:5173 in your browser.

### Language Toggle

Click the language button (Python/Clojure) in the terminal header to switch between languages.

### REPL Mode

Type commands directly. Press Enter to execute.

**Python:**
```python
Doc.open()                           # Create a blank document
Doc.create.paragraph(text="Hello")   # Add a paragraph
Doc.info()                           # Get document stats
help(Doc)                            # Show available commands
```

**Clojure:**
```clojure
(doc-open)                           ; Create a blank document
(doc-create-paragraph :text "Hello") ; Add a paragraph
(doc-info)                           ; Get document stats
(help)                               ; Show available commands
```

### Script Mode

Click "Script" to switch to multi-line editor mode. Write a full script and run with Cmd+Enter.

### File Upload

Upload a .docx file, then load it:

**Python:** `Doc.open(path="filename.docx")`

**Clojure:** `(doc-open :path "filename.docx")`

## API Reference

### Python Syntax

| Operation | Example |
|-----------|---------|
| Open blank doc | `Doc.open()` |
| Open file | `Doc.open(path="file.docx")` |
| Document info | `Doc.info()` |
| Get text | `Doc.getText()` |
| Create paragraph | `Doc.create.paragraph(text="Hello")` |
| Create heading | `Doc.create.heading(text="Title", level=1)` |
| Format bold | `Doc.format.bold(target={...})` |
| Help | `help(Doc)` |

### Clojure Syntax

| Operation | Example |
|-----------|---------|
| Open blank doc | `(doc-open)` |
| Open file | `(doc-open :path "file.docx")` |
| Document info | `(doc-info)` |
| Get text | `(doc-get-text)` |
| Create paragraph | `(doc-create-paragraph :text "Hello")` |
| Create heading | `(doc-create-heading :text "Title" :level 1)` |
| Format bold | `(doc-format-bold :target {...})` |
| Help | `(help)` |

### All Operations

**Core:** `doc-info`, `doc-get`, `doc-get-text`, `doc-get-markdown`, `doc-get-html`, `doc-find`, `doc-get-node`, `doc-get-node-by-id`, `doc-capabilities`, `doc-extract`, `doc-markdown-to-fragment`

**Create:** `doc-create-paragraph`, `doc-create-heading`, `doc-create-table`, `doc-create-section-break`, `doc-create-toc`, `doc-create-image`, `doc-create-content-control`

**Mutate:** `doc-insert`, `doc-replace`, `doc-delete`, `doc-clear-content`, `doc-format-range`, `doc-format-apply`

**Blocks:** `doc-blocks-list`, `doc-blocks-delete`, `doc-blocks-delete-range`

**Styles:** `doc-styles-apply`, `doc-styles-paragraph-set`, `doc-styles-paragraph-clear`

**Paragraphs:** `doc-para-reset-formatting`, `doc-para-set-alignment`, `doc-para-clear-alignment`, `doc-para-set-indentation`, `doc-para-clear-indentation`, `doc-para-set-spacing`, `doc-para-clear-spacing`, `doc-para-set-border`, `doc-para-clear-border`, `doc-para-set-shading`, `doc-para-clear-shading`, `doc-para-set-direction`, `doc-para-clear-direction`, `doc-para-set-tab-stop`, `doc-para-clear-tab-stop`, `doc-para-clear-all-tab-stops`

**Sections:** `doc-sections-list`, `doc-sections-get`, `doc-sections-set-break-type`, `doc-sections-set-page-margins`, `doc-sections-set-page-setup`, `doc-sections-set-columns`, `doc-sections-set-page-numbering`, `doc-sections-set-page-borders`, `doc-sections-clear-page-borders`

**Lists:** `doc-lists-list`, `doc-lists-get`, `doc-lists-create`, `doc-lists-insert`, `doc-lists-attach`, `doc-lists-detach`, `doc-lists-delete`, `doc-lists-indent`, `doc-lists-outdent`, `doc-lists-set-level`, `doc-lists-set-type`, `doc-lists-apply-preset`, `doc-lists-convert-to-text`

**Tables:** `doc-tables-get`, `doc-tables-get-cells`, `doc-tables-delete`, `doc-tables-clear-contents`, `doc-tables-insert-row`, `doc-tables-delete-row`, `doc-tables-insert-column`, `doc-tables-delete-column`, `doc-tables-insert-cell`, `doc-tables-delete-cell`, `doc-tables-merge-cells`, `doc-tables-unmerge-cells`, `doc-tables-split-cell`, `doc-tables-set-cell-text`, `doc-tables-set-cell-properties`, `doc-tables-set-row-height`, `doc-tables-set-column-width`, `doc-tables-set-style`, `doc-tables-clear-style`, `doc-tables-set-border`, `doc-tables-clear-border`, `doc-tables-set-shading`, `doc-tables-clear-shading`, `doc-tables-apply-preset`, `doc-tables-sort`, `doc-tables-convert-from-text`, `doc-tables-convert-to-text`

**Images:** `doc-images-list`, `doc-images-get`, `doc-images-delete`, `doc-images-move`, `doc-images-set-size`, `doc-images-scale`, `doc-images-rotate`, `doc-images-flip`, `doc-images-crop`, `doc-images-reset-crop`, `doc-images-set-wrap-type`, `doc-images-set-position`, `doc-images-set-alt-text`, `doc-images-replace-source`, `doc-images-convert-to-inline`, `doc-images-convert-to-floating`

**Hyperlinks:** `doc-hyperlinks-list`, `doc-hyperlinks-get`, `doc-hyperlinks-insert`, `doc-hyperlinks-wrap`, `doc-hyperlinks-patch`, `doc-hyperlinks-remove`

**Bookmarks:** `doc-bookmarks-list`, `doc-bookmarks-get`, `doc-bookmarks-insert`, `doc-bookmarks-rename`, `doc-bookmarks-remove`

**Comments:** `doc-comments-list`, `doc-comments-get`, `doc-comments-create`, `doc-comments-patch`, `doc-comments-delete`

**Track Changes:** `doc-track-changes-list`, `doc-track-changes-get`, `doc-track-changes-decide`

**Content Controls:** `doc-cc-list`, `doc-cc-get`, `doc-cc-list-in-range`, `doc-cc-select-by-tag`, `doc-cc-select-by-title`, `doc-cc-wrap`, `doc-cc-unwrap`, `doc-cc-delete`, `doc-cc-patch`, `doc-cc-get-content`, `doc-cc-replace-content`, `doc-cc-clear-content`, `doc-cc-set-lock-mode`, `doc-cc-set-type`, `doc-cc-text-set-value`, `doc-cc-text-clear-value`, `doc-cc-date-set-value`, `doc-cc-date-clear-value`, `doc-cc-checkbox-get-state`, `doc-cc-checkbox-set-state`, `doc-cc-checkbox-toggle`, `doc-cc-choice-get-items`, `doc-cc-choice-set-items`, `doc-cc-choice-set-selected`

**Headers/Footers:** `doc-hf-list`, `doc-hf-get`, `doc-hf-resolve`, `doc-hf-parts-list`, `doc-hf-parts-create`, `doc-hf-parts-delete`

**Footnotes:** `doc-footnotes-list`, `doc-footnotes-get`, `doc-footnotes-insert`, `doc-footnotes-update`, `doc-footnotes-remove`

**Table of Contents:** `doc-toc-list`, `doc-toc-get`, `doc-toc-configure`, `doc-toc-update`, `doc-toc-remove`

**Fields:** `doc-fields-list`, `doc-fields-get`, `doc-fields-insert`, `doc-fields-rebuild`, `doc-fields-remove`

**Cross-References:** `doc-cross-refs-list`, `doc-cross-refs-get`, `doc-cross-refs-insert`, `doc-cross-refs-rebuild`, `doc-cross-refs-remove`

**Citations:** `doc-citations-list`, `doc-citations-get`, `doc-citations-insert`, `doc-citations-update`, `doc-citations-remove`, `doc-citations-sources-list`, `doc-citations-sources-get`, `doc-citations-sources-insert`, `doc-citations-bib-insert`, `doc-citations-bib-rebuild`

**History:** `doc-history-get`, `doc-undo`, `doc-redo`

**Diff:** `doc-diff-capture`, `doc-diff-compare`, `doc-diff-apply`

**Protection:** `doc-protection-get`, `doc-protection-set`, `doc-protection-clear`

**Query:** `doc-query-match`, `doc-ranges-resolve`, `doc-selection-current`

**Metadata:** `doc-metadata-list`, `doc-metadata-get`, `doc-metadata-attach`, `doc-metadata-update`, `doc-metadata-remove`

## Clojure Features

The embedded Clojure interpreter supports:

- **Special forms:** `def`, `defn`, `fn`, `if`, `when`, `cond`, `let`, `do`, `quote`, `->`, `->>`
- **Primitives:** `+`, `-`, `*`, `/`, `=`, `<`, `>`, `<=`, `>=`, `not`, `mod`, `inc`, `dec`
- **Collections:** `list`, `vector`, `hash-map`, `first`, `rest`, `cons`, `conj`, `nth`, `count`
- **Sequences:** `map`, `filter`, `reduce`, `range`, `take`, `drop`, `into`
- **Maps:** `get`, `get-in`, `assoc`, `assoc-in`, `dissoc`, `update`, `keys`, `vals`, `merge`
- **Predicates:** `nil?`, `empty?`, `seq?`, `vector?`, `map?`, `string?`, `number?`, `keyword?`
- **Strings:** `str`, `subs`, `split`, `join`
- **I/O:** `print`, `println`, `prn`

Example script:
```clojure
(doc-open)

(defn add-para [text]
  (doc-create-paragraph :text text))

(add-para "First paragraph")
(add-para "Second paragraph")

(println "Document created!")
(doc-info)
```

### Clojure Data Structures

```clojure
; Vectors (ordered collections)
[1 2 3]
(def nums [1 2 3])
(first nums)  ; => 1
(rest nums)   ; => [2 3]
(conj nums 4) ; => [1 2 3 4]

; Maps (key-value pairs)
{:name "Alice" :age 30}
(def person {:name "Alice" :age 30})
(get person :name)        ; => "Alice"
(:age person)             ; => 30 (keywords are functions)
(assoc person :city "NY") ; => {:name "Alice" :age 30 :city "NY"}

; Threading macros
(-> person
    (assoc :email "alice@example.com")
    (dissoc :age))
; => {:name "Alice" :email "alice@example.com"}
```
