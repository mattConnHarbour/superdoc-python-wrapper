# SuperDoc Python Wrapper

> ⚠️ **Unofficial** - This is an unofficial Python wrapper for [SuperDoc](https://superdoc.dev). Not affiliated with or endorsed by SuperDoc.

A Python library for programmatically manipulating Word documents (.docx) using the SuperDoc document engine.

## Features

- **335+ document operations** - Full access to SuperDoc's document manipulation API
- **No HTTP server required** - Communicates via stdin/stdout with a Node.js subprocess
- **Auto-generated from SuperDoc** - Operations stay in sync with the SuperDoc package
- **Simple Python API** - Clean function calls with keyword arguments

## Installation

```bash
# Clone the repository
git clone <repo-url>
cd superdoc-python-wrapper

# Install Node.js dependencies
pnpm install
```

**Requirements:**
- Python 3.x
- Node.js with `npx` available
- pnpm (or npm)

## Quick Start

```python
from superdoc import *

# Create a new document
open()

# Add content
create_heading(text="My Document", level=1)
create_paragraph(text="Hello, World!")
create_table(rows=3, columns=4)

# Query the document
print(blocks_list())
print(info())

# Save to file
export("output.docx")
```

### Interactive REPL

```bash
cd server
python3 superdoc.py
```

## Usage

### Document Management

```python
open()                    # Create blank document
open("file.docx")         # Open existing document
export("output.docx")     # Save to file
export()                  # Get base64-encoded docx
reset()                   # Close document and reset session
info()                    # Get document statistics
```

### Creating Content

```python
create_paragraph(text="Hello")
create_heading(text="Title", level=1)
create_table(rows=3, columns=4)
create_image(src="path/to/image.png")
```

### Content Controls (SDT Fields)

```python
# Create a locked content control
api('create.contentControl',
    kind='block',
    type='richText',
    text='Editable content here',
    tag='my-field',
    lockMode='sdtContentLocked'  # unlocked, sdtLocked, contentLocked, sdtContentLocked
)

# Query and manipulate
content_controls_list()
content_controls_select_by_tag("my-field")
content_controls_replace_content(target, content="New text")
```

### Formatting

```python
# Get a target from blocks_list()
blocks = blocks_list()['blocks']
target = {"kind": "blockId", "nodeType": "paragraph", "nodeId": blocks[0]['nodeId']}

# Apply formatting
format_apply(target, bold=True, italic=True, highlight="yellow")
```

### Generic API Access

Any SuperDoc operation can be called directly:

```python
api("operation.id", param1=value1, param2=value2)

# Examples
api("tables.insertRow", target=target, position="after")
api("hyperlinks.insert", target=target, url="https://example.com", text="Click here")
api("history.undo")
```

## Regenerating from SuperDoc

When the SuperDoc package updates, regenerate the operations list:

```bash
pnpm run generate
```

This reads from `node_modules/superdoc/dist/document-api/src/contract/operation-definitions.d.ts` and generates `server/operations.ts`.

## Project Structure

```
server/
  superdoc.py           # Main Python library
  superdoc-backend.ts   # Node.js backend (spawned automatically)
  operations.ts         # Auto-generated operation definitions
scripts/
  generate-operations.ts  # Operation generator script
```

## All Operations (335)

### authorities (11)
| Operation | Description |
|-----------|-------------|
| `authorities.configure` | Update the configuration of an existing table-of-authorities block. |
| `authorities.entries.get` | Get detailed information about a specific TA authority entry. |
| `authorities.entries.insert` | Insert a new TA authority entry field at a target location. |
| `authorities.entries.list` | List all TA (authority entry) fields in the document. |
| `authorities.entries.remove` | Remove a TA authority entry field from the document. |
| `authorities.entries.update` | Update the properties of an existing TA authority entry. |
| `authorities.get` | Get detailed information about a specific table-of-authorities block. |
| `authorities.insert` | Insert a new table-of-authorities block at a target location. |
| `authorities.list` | List all table-of-authorities blocks in the document. |
| `authorities.rebuild` | Rebuild a table-of-authorities block from its entries. |
| `authorities.remove` | Remove a table-of-authorities block from the document. |

### blocks (3)
| Operation | Description |
|-----------|-------------|
| `blocks.delete` | Delete an entire block node (paragraph, heading, list item, table, image, or sdt) deterministically. |
| `blocks.deleteRange` | Delete a contiguous range of top-level blocks between two endpoints (inclusive). |
| `blocks.list` | List top-level blocks in document order with IDs, types, text previews, and optional full text. |

### bookmarks (5)
| Operation | Description |
|-----------|-------------|
| `bookmarks.get` | Get detailed information about a specific bookmark. |
| `bookmarks.insert` | Insert a new named bookmark at a target location. |
| `bookmarks.list` | List all bookmarks in the document. |
| `bookmarks.remove` | Remove a bookmark from the document. |
| `bookmarks.rename` | Rename an existing bookmark. |

### captions (6)
| Operation | Description |
|-----------|-------------|
| `captions.configure` | Configure numbering format for a caption label. |
| `captions.get` | Get detailed information about a specific caption paragraph. |
| `captions.insert` | Insert a new caption paragraph adjacent to a target block. |
| `captions.list` | List all caption paragraphs in the document. |
| `captions.remove` | Remove a caption paragraph from the document. |
| `captions.update` | Update the text of an existing caption paragraph. |

### citations (15)
| Operation | Description |
|-----------|-------------|
| `citations.bibliography.configure` | Configure the bibliography style. |
| `citations.bibliography.get` | Get information about the bibliography block. |
| `citations.bibliography.insert` | Insert a bibliography block at a target location. |
| `citations.bibliography.rebuild` | Rebuild the bibliography from current sources. |
| `citations.bibliography.remove` | Remove the bibliography block from the document. |
| `citations.get` | Get detailed information about a specific citation mark. |
| `citations.insert` | Insert a new citation mark at a target location. |
| `citations.list` | List all citation marks in the document. |
| `citations.remove` | Remove a citation mark from the document. |
| `citations.sources.get` | Get detailed information about a specific citation source. |
| `citations.sources.insert` | Register a new citation source in the document store. |
| `citations.sources.list` | List all citation sources in the document store. |
| `citations.sources.remove` | Remove a citation source from the document store. |
| `citations.sources.update` | Update the fields of an existing citation source. |
| `citations.update` | Update an existing citation mark's source references. |

### comments (5)
| Operation | Description |
|-----------|-------------|
| `comments.create` | Create a new comment thread (or reply when parentCommentId is given). |
| `comments.delete` | Remove a comment or reply by ID. |
| `comments.get` | Retrieve a single comment thread by ID. |
| `comments.list` | List all comment threads in the document. |
| `comments.patch` | Patch fields on an existing comment (text, target, status, or isInternal). |

### contentControls (54)
| Operation | Description |
|-----------|-------------|
| `contentControls.appendContent` | Append content to the end of a content control. |
| `contentControls.checkbox.getState` | Get the checked state of a checkbox content control. |
| `contentControls.checkbox.setState` | Set the checked state of a checkbox content control. |
| `contentControls.checkbox.setSymbolPair` | Set the checked and unchecked symbol glyphs for a checkbox. |
| `contentControls.checkbox.toggle` | Toggle the checked state of a checkbox content control. |
| `contentControls.choiceList.getItems` | Get the list items and selected value of a comboBox or dropDownList. |
| `contentControls.choiceList.setItems` | Replace the list items of a comboBox or dropDownList. |
| `contentControls.choiceList.setSelected` | Set the selected value of a comboBox or dropDownList. |
| `contentControls.clearBinding` | Remove data binding metadata from a content control. |
| `contentControls.clearContent` | Clear all content inside a content control, leaving it empty. |
| `contentControls.copy` | Copy a content control to a destination position. |
| `contentControls.date.clearValue` | Clear the date value of a date content control. |
| `contentControls.date.setCalendar` | Set the calendar type for a date content control. |
| `contentControls.date.setDisplayFormat` | Set the display format string for a date content control. |
| `contentControls.date.setDisplayLocale` | Set the display locale for a date content control. |
| `contentControls.date.setStorageFormat` | Set the XML storage format for a date content control. |
| `contentControls.date.setValue` | Set the date value of a date content control. |
| `contentControls.delete` | Delete a content control and its content from the document. |
| `contentControls.get` | Retrieve a single content control by target. |
| `contentControls.getBinding` | Get the data binding metadata of a content control. |
| `contentControls.getContent` | Get the text content of a content control. |
| `contentControls.getParent` | Get the parent content control of the target, if any. |
| `contentControls.getRawProperties` | Get the raw sdtPr properties of a content control. |
| `contentControls.group.ungroup` | Remove the group designation from a group content control. |
| `contentControls.group.wrap` | Wrap a content control inside a new group content control. |
| `contentControls.insertAfter` | Insert content immediately after a content control. |
| `contentControls.insertBefore` | Insert content immediately before a content control. |
| `contentControls.list` | List all content controls in the document with optional filtering. |
| `contentControls.listChildren` | List direct child content controls nested inside the target. |
| `contentControls.listInRange` | List content controls within a block range. |
| `contentControls.move` | Move a content control to a new position. |
| `contentControls.normalizeTagPayload` | Normalize a content control tag between formats. |
| `contentControls.normalizeWordCompatibility` | Normalize a content control to resolve Word compatibility issues. |
| `contentControls.patch` | Patch metadata properties on a content control. |
| `contentControls.patchRawProperties` | Apply raw XML-level patches to the sdtPr subtree. |
| `contentControls.prependContent` | Prepend content to the beginning of a content control. |
| `contentControls.repeatingSection.cloneItem` | Clone a repeating section item at the given index. |
| `contentControls.repeatingSection.deleteItem` | Delete a repeating section item at the given index. |
| `contentControls.repeatingSection.insertItemAfter` | Insert a new item after a specific index in a repeating section. |
| `contentControls.repeatingSection.insertItemBefore` | Insert a new item before a specific index in a repeating section. |
| `contentControls.repeatingSection.listItems` | List the repeating section items inside a repeating section. |
| `contentControls.repeatingSection.setAllowInsertDelete` | Set the allowInsertDelete flag on a repeating section. |
| `contentControls.replaceContent` | Replace the entire content of a content control. |
| `contentControls.selectByTag` | Select content controls matching a specific tag value. |
| `contentControls.selectByTitle` | Select content controls matching a specific title value. |
| `contentControls.setBinding` | Set data binding metadata on a content control. |
| `contentControls.setLockMode` | Set the lock mode on a content control. |
| `contentControls.setType` | Transition a content control to a different semantic type. |
| `contentControls.text.clearValue` | Clear the text value of a plain-text content control. |
| `contentControls.text.setMultiline` | Set or clear the multiline attribute on a plain-text control. |
| `contentControls.text.setValue` | Set the text value of a plain-text content control. |
| `contentControls.unwrap` | Remove the content control wrapper, preserving its content. |
| `contentControls.validateWordCompatibility` | Validate a content control for Word compatibility issues. |
| `contentControls.wrap` | Wrap existing content with a new content control. |
| `create.contentControl` | Create a new content control (SDT) in the document. |

### create (6)
| Operation | Description |
|-----------|-------------|
| `create.heading` | Create a new heading at the target position. |
| `create.image` | Insert a new image at the target position. |
| `create.paragraph` | Create a standalone paragraph at the target position. |
| `create.sectionBreak` | Create a section break at the target location. |
| `create.table` | Create a new table at the target position. |
| `create.tableOfContents` | Insert a new table of contents at the target position. |

### crossRefs (5)
| Operation | Description |
|-----------|-------------|
| `crossRefs.get` | Get detailed information about a specific cross-reference field. |
| `crossRefs.insert` | Insert a new cross-reference field at a target location. |
| `crossRefs.list` | List all cross-reference fields in the document. |
| `crossRefs.rebuild` | Rebuild (recalculate) a cross-reference field. |
| `crossRefs.remove` | Remove a cross-reference field from the document. |

### customXml (2)
| Operation | Description |
|-----------|-------------|
| `customXml.parts.create` | Add a new Custom XML Data Storage Part to the document. |
| `customXml.parts.list` | List Custom XML Data Storage Parts in the document. |

### fields (5)
| Operation | Description |
|-----------|-------------|
| `fields.get` | Get detailed information about a specific field. |
| `fields.insert` | Insert a raw field code at a target location. |
| `fields.list` | List all fields in the document. |
| `fields.rebuild` | Rebuild (recalculate) a field. |
| `fields.remove` | Remove a field from the document. |

### footnotes (6)
| Operation | Description |
|-----------|-------------|
| `footnotes.configure` | Configure numbering and placement for footnotes or endnotes. |
| `footnotes.get` | Get detailed information about a specific footnote or endnote. |
| `footnotes.insert` | Insert a new footnote or endnote at a target location. |
| `footnotes.list` | List all footnotes and endnotes in the document. |
| `footnotes.remove` | Remove a footnote or endnote from the document. |
| `footnotes.update` | Update the content of an existing footnote or endnote. |

### format (1)
| Operation | Description |
|-----------|-------------|
| `format.apply` | Apply inline run-property patch changes to the target range. |

### format.paragraph (19)
| Operation | Description |
|-----------|-------------|
| `format.paragraph.clearAlignment` | Remove direct paragraph alignment. |
| `format.paragraph.clearAllTabStops` | Remove all tab stops from a paragraph. |
| `format.paragraph.clearBorder` | Remove border for a specific side or all sides. |
| `format.paragraph.clearDirection` | Remove explicit paragraph direction. |
| `format.paragraph.clearIndentation` | Remove all direct paragraph indentation. |
| `format.paragraph.clearShading` | Remove all paragraph shading. |
| `format.paragraph.clearSpacing` | Remove all direct paragraph spacing. |
| `format.paragraph.clearTabStop` | Remove a tab stop at a given position. |
| `format.paragraph.resetDirectFormatting` | Strip all direct paragraph formatting. |
| `format.paragraph.setAlignment` | Set visual paragraph alignment. |
| `format.paragraph.setBorder` | Set border properties for a specific side. |
| `format.paragraph.setDirection` | Set paragraph base direction (LTR or RTL). |
| `format.paragraph.setFlowOptions` | Set contextual spacing, page-break-before, and hyphens flags. |
| `format.paragraph.setIndentation` | Set paragraph indentation properties. |
| `format.paragraph.setKeepOptions` | Set keep-with-next, keep-lines-together, and widow/orphan control. |
| `format.paragraph.setOutlineLevel` | Set the paragraph outline level (0–9). |
| `format.paragraph.setShading` | Set paragraph shading (background fill, pattern). |
| `format.paragraph.setSpacing` | Set paragraph spacing properties. |
| `format.paragraph.setTabStop` | Add or replace a tab stop at a given position. |

### headerFooters (9)
| Operation | Description |
|-----------|-------------|
| `headerFooters.get` | Get a single header/footer slot entry by address. |
| `headerFooters.list` | List header/footer slot entries across sections. |
| `headerFooters.parts.create` | Create a new independent header/footer part. |
| `headerFooters.parts.delete` | Delete a header/footer part and its relationship. |
| `headerFooters.parts.list` | List unique header/footer part records. |
| `headerFooters.refs.clear` | Clear an explicit header/footer reference from a section slot. |
| `headerFooters.refs.set` | Set an explicit header/footer reference on a section slot. |
| `headerFooters.refs.setLinkedToPrevious` | Link or unlink a header/footer slot to/from the previous section. |
| `headerFooters.resolve` | Resolve the effective header/footer reference for a slot. |

### history (3)
| Operation | Description |
|-----------|-------------|
| `history.get` | Query the current undo/redo history state. |
| `history.redo` | Redo the most recently undone action. |
| `history.undo` | Undo the most recent history-safe mutation. |

### hyperlinks (6)
| Operation | Description |
|-----------|-------------|
| `hyperlinks.get` | Retrieve details of a specific hyperlink. |
| `hyperlinks.insert` | Insert new linked text at a target position. |
| `hyperlinks.list` | List all hyperlinks in the document. |
| `hyperlinks.patch` | Update hyperlink metadata without changing display text. |
| `hyperlinks.remove` | Remove a hyperlink. |
| `hyperlinks.wrap` | Wrap an existing text range with a hyperlink. |

### images (27)
| Operation | Description |
|-----------|-------------|
| `images.convertToFloating` | Convert an inline image to floating placement. |
| `images.convertToInline` | Convert a floating image to inline placement. |
| `images.crop` | Apply rectangular edge-percentage crop to an image. |
| `images.delete` | Delete an image from the document. |
| `images.flip` | Set horizontal and/or vertical flip state. |
| `images.get` | Get details for a specific image by its stable ID. |
| `images.insertCaption` | Insert a caption paragraph below the image. |
| `images.list` | List all images in the document. |
| `images.move` | Move an image to a new location in the document. |
| `images.removeCaption` | Remove the caption paragraph from below the image. |
| `images.replaceSource` | Replace the image source while preserving identity. |
| `images.resetCrop` | Remove all cropping from an image. |
| `images.rotate` | Set the absolute rotation angle for an image. |
| `images.scale` | Scale an image by a uniform factor. |
| `images.setAltText` | Set the accessibility description (alt text). |
| `images.setAnchorOptions` | Set anchor behavior options for a floating image. |
| `images.setDecorative` | Mark or unmark an image as decorative. |
| `images.setHyperlink` | Set or remove the hyperlink attached to an image. |
| `images.setLockAspectRatio` | Lock or unlock the aspect ratio. |
| `images.setName` | Set the object name for an image. |
| `images.setPosition` | Set the anchor position for a floating image. |
| `images.setSize` | Set explicit width/height for an image. |
| `images.setWrapDistances` | Set the text-wrap distance margins. |
| `images.setWrapSide` | Set which side(s) text wraps around. |
| `images.setWrapType` | Set the text wrapping type. |
| `images.setZOrder` | Set the z-order (relativeHeight). |
| `images.updateCaption` | Update the text of an existing caption paragraph. |

### index (11)
| Operation | Description |
|-----------|-------------|
| `index.configure` | Update the configuration of an existing index block. |
| `index.entries.get` | Get detailed information about a specific XE index entry. |
| `index.entries.insert` | Insert a new XE index entry field at a target location. |
| `index.entries.list` | List all XE (index entry) fields in the document. |
| `index.entries.remove` | Remove an XE index entry field from the document. |
| `index.entries.update` | Update the properties of an existing XE index entry. |
| `index.get` | Get detailed information about a specific index block. |
| `index.insert` | Insert a new index block at a target location. |
| `index.list` | List all index blocks in the document. |
| `index.rebuild` | Rebuild (regenerate) an index block from its entries. |
| `index.remove` | Remove an index block from the document. |

### lists (38)
| Operation | Description |
|-----------|-------------|
| `lists.applyPreset` | Apply a built-in list formatting preset. |
| `lists.applyStyle` | Apply a reusable list style to the target list. |
| `lists.applyTemplate` | Apply a captured ListTemplate to the target list. |
| `lists.attach` | Convert non-list paragraphs to list items. |
| `lists.canContinuePrevious` | Check whether the target can continue numbering from a previous sequence. |
| `lists.canJoin` | Check whether two adjacent list sequences can be joined. |
| `lists.captureTemplate` | Capture list formatting from the abstract definition. |
| `lists.clearLevelOverrides` | Remove instance-level overrides for a specific list level. |
| `lists.continuePrevious` | Continue numbering from the nearest compatible previous list. |
| `lists.convertToText` | Convert list items to plain paragraphs. |
| `lists.create` | Create a new list from one or more paragraphs. |
| `lists.detach` | Remove numbering properties from list items. |
| `lists.get` | Retrieve a specific list node by target. |
| `lists.getStyle` | Read the effective reusable style of a list. |
| `lists.indent` | Increase the indentation level of a list item. |
| `lists.insert` | Insert a new list item before or after an existing list item. |
| `lists.join` | Merge two adjacent list sequences into one. |
| `lists.list` | List all list nodes in the document. |
| `lists.merge` | Merge two adjacent list sequences into one. |
| `lists.outdent` | Decrease the indentation level of a list item. |
| `lists.restartAt` | Restart numbering at the target list item. |
| `lists.separate` | Split a list sequence at the target item. |
| `lists.setLevel` | Set the absolute nesting level (0..8) of a list item. |
| `lists.setLevelAlignment` | Set the marker alignment for a specific list level. |
| `lists.setLevelBullet` | Set the bullet marker text for a specific list level. |
| `lists.setLevelIndents` | Set the paragraph indentation values for a list level. |
| `lists.setLevelLayout` | Set the layout properties for a specific list level. |
| `lists.setLevelMarkerFont` | Set the font family used for the marker character. |
| `lists.setLevelNumbering` | Set format, pattern, and start in one call. |
| `lists.setLevelNumberStyle` | Set the numbering style (e.g. decimal, lowerLetter). |
| `lists.setLevelPictureBullet` | Set a picture bullet for a specific list level. |
| `lists.setLevelRestart` | Set the restart behavior for a specific list level. |
| `lists.setLevelStart` | Set the start value for a specific list level. |
| `lists.setLevelText` | Set the level text pattern. |
| `lists.setLevelTrailingCharacter` | Set the trailing character after the marker. |
| `lists.setType` | Convert a list to ordered or bullet. |
| `lists.setValue` | Set an explicit numbering value at the target item. |
| `lists.split` | Split a list sequence at the target item into two sequences. |

### metadata (5)
| Operation | Description |
|-----------|-------------|
| `metadata.get` | Get a single anchored-metadata entry by id. |
| `metadata.list` | List anchored-metadata entries in the document. |
| `metadata.remove` | Remove an anchored-metadata entry. |
| `metadata.resolve` | Find where an anchored-metadata entry is anchored. |
| `metadata.update` | Replace the JSON payload of an existing anchored-metadata entry. |

### mutations (2)
| Operation | Description |
|-----------|-------------|
| `mutations.apply` | Execute a mutation plan atomically against the document. |
| `mutations.preview` | Dry-run a mutation plan, returning resolved targets. |

### permissionRanges (5)
| Operation | Description |
|-----------|-------------|
| `permissionRanges.create` | Create a permission range exception region. |
| `permissionRanges.get` | Get detailed information about a specific permission range. |
| `permissionRanges.list` | List all permission ranges in the document. |
| `permissionRanges.remove` | Remove a permission range by ID. |
| `permissionRanges.updatePrincipal` | Change which principal is allowed to edit a permission range. |

### protection (3)
| Operation | Description |
|-----------|-------------|
| `protection.clearEditingRestriction` | Disable document-level editing restriction. |
| `protection.get` | Read the current document protection state. |
| `protection.setEditingRestriction` | Enable Word-style editing restriction on the document. |

### query (1)
| Operation | Description |
|-----------|-------------|
| `query.match` | Deterministic selector-based search returning mutation-grade addresses. |

### ranges (1)
| Operation | Description |
|-----------|-------------|
| `ranges.resolve` | Resolve two explicit anchors into a contiguous document range. |

### sections (18)
| Operation | Description |
|-----------|-------------|
| `sections.clearHeaderFooterRef` | Clear a section header/footer reference. |
| `sections.clearPageBorders` | Clear page border configuration for a section. |
| `sections.get` | Retrieve full section information by section address. |
| `sections.list` | List sections in deterministic order. |
| `sections.setBreakType` | Set the section break type. |
| `sections.setColumns` | Set column configuration for a section. |
| `sections.setHeaderFooterMargins` | Set header/footer margin distances for a section. |
| `sections.setHeaderFooterRef` | Set or replace a section header/footer reference. |
| `sections.setLineNumbering` | Enable or configure line numbering for a section. |
| `sections.setLinkToPrevious` | Set or clear link-to-previous behavior. |
| `sections.setOddEvenHeadersFooters` | Enable or disable odd/even header-footer mode. |
| `sections.setPageBorders` | Set page border configuration for a section. |
| `sections.setPageMargins` | Set page-edge margins for a section. |
| `sections.setPageNumbering` | Set page numbering format/start for a section. |
| `sections.setPageSetup` | Set page size/orientation properties. |
| `sections.setSectionDirection` | Set section text flow direction (LTR/RTL). |
| `sections.setTitlePage` | Enable or disable title-page behavior. |
| `sections.setVerticalAlign` | Set vertical page alignment for a section. |

### selection (1)
| Operation | Description |
|-----------|-------------|
| `selection.current` | Read the editor's current selection as a portable SelectionInfo. |

### styles (1)
| Operation | Description |
|-----------|-------------|
| `styles.apply` | Apply document-level default style changes to the stylesheet. |

### styles.paragraph (2)
| Operation | Description |
|-----------|-------------|
| `styles.paragraph.clearStyle` | Remove the paragraph style reference from a paragraph. |
| `styles.paragraph.setStyle` | Apply a paragraph style to a paragraph-like block. |

### tables (43)
| Operation | Description |
|-----------|-------------|
| `tables.applyBorderPreset` | Apply a border preset to a table. |
| `tables.clearBorder` | Remove border formatting from a table or cell range. |
| `tables.clearCellSpacing` | Remove custom cell spacing from the target table. |
| `tables.clearContents` | Clear the contents of the target table or cell range. |
| `tables.clearDefaultStyle` | Remove the document-level default table style. |
| `tables.clearShading` | Remove shading from a table or cell range. |
| `tables.clearStyle` | Remove the applied table style. |
| `tables.convertFromText` | Convert a text range into a table. |
| `tables.convertToText` | Convert a table back to plain text. |
| `tables.delete` | Delete the target table from the document. |
| `tables.deleteCell` | Delete a cell from a table row. |
| `tables.deleteColumn` | Delete a column from the target table. |
| `tables.deleteRow` | Delete a row from the target table. |
| `tables.distributeColumns` | Distribute column widths evenly. |
| `tables.distributeRows` | Distribute row heights evenly. |
| `tables.get` | Retrieve table structure and dimensions. |
| `tables.getCells` | Retrieve cell information for a table. |
| `tables.getProperties` | Retrieve layout and style properties of a table. |
| `tables.getStyles` | List all table styles and the default table style setting. |
| `tables.insertCell` | Insert a new cell into a table row. |
| `tables.insertColumn` | Insert a new column into the target table. |
| `tables.insertRow` | Insert a new row into the target table. |
| `tables.mergeCells` | Merge a range of table cells into one. |
| `tables.move` | Move a table to a new position in the document. |
| `tables.setAltText` | Set the alternative text description for a table. |
| `tables.setBorder` | Set border properties on a table or cell range. |
| `tables.setBorders` | Set borders on a table using a target set or per-edge patch. |
| `tables.setCellPadding` | Set padding on a specific table cell or cell range. |
| `tables.setCellSpacing` | Set the cell spacing for the target table. |
| `tables.setColumnWidth` | Set the width of a table column. |
| `tables.setDefaultStyle` | Set the document-level default table style. |
| `tables.setLayout` | Set the layout mode of the target table. |
| `tables.setRowHeight` | Set the height of a table row. |
| `tables.setRowOptions` | Set options on a table row such as header repeat. |
| `tables.setShading` | Set the background shading color. |
| `tables.setStyle` | Apply a named table style to the target table. |
| `tables.setStyleOption` | Toggle a conditional style option. |
| `tables.setTableOptions` | Set table-level default cell margins and/or spacing. |
| `tables.setTablePadding` | Set default cell padding for the entire table. |
| `tables.sort` | Sort table rows by a column value. |
| `tables.split` | Split a table into two tables at the target row. |
| `tables.splitCell` | Split a table cell into multiple cells. |
| `tables.unmergeCells` | Unmerge a previously merged table cell. |

### toc (10)
| Operation | Description |
|-----------|-------------|
| `toc.configure` | Update the configuration switches of a table of contents. |
| `toc.editEntry` | Update the properties of a TC field. |
| `toc.get` | Retrieve details of a specific table of contents. |
| `toc.getEntry` | Retrieve details of a specific TC field. |
| `toc.list` | List all tables of contents in the document. |
| `toc.listEntries` | List all TC fields in the document body. |
| `toc.markEntry` | Insert a TC field at the target paragraph. |
| `toc.remove` | Remove a table of contents from the document. |
| `toc.unmarkEntry` | Remove a TC field from the document. |
| `toc.update` | Rebuild or refresh the content of a table of contents. |

### trackChanges (3)
| Operation | Description |
|-----------|-------------|
| `trackChanges.decide` | Accept or reject tracked changes. |
| `trackChanges.get` | Retrieve a single tracked change by ID. |
| `trackChanges.list` | List all tracked changes in the document. |

## License

MIT
