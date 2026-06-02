# SuperDoc Python Wrapper

Python library for manipulating Word documents using the SuperDoc engine.

## Architecture

```
Python (superdoc.py)  ←→  stdin/stdout JSON  ←→  Node.js (superdoc-backend.ts)  ←→  SuperDoc
```

Python spawns Node.js as a subprocess - no HTTP server needed.

## Files

```
server/
  superdoc.py          # Main Python library
  superdoc-backend.ts  # Node.js backend (spawned by Python)
  operations.ts        # Auto-generated operation definitions
scripts/
  generate-operations.ts  # Regenerate operations from SuperDoc
```

## Installation

```bash
pnpm install
```

## Usage

### Interactive REPL
```bash
cd server
python3 superdoc.py
```

### In Scripts
```python
from superdoc import *

open()                              # Create blank document
open("existing.docx")               # Open existing file
create_heading(text="Title", level=1)
create_paragraph(text="Hello!")
blocks_list()                       # List all blocks
export("output.docx")               # Save to file
```

## Common Operations

```python
# Document
open(path=None)           # Create/open document
export("file.docx")       # Save to file
reset()                   # Clear session
info()                    # Statistics

# Create
create_paragraph(text="...")
create_heading(text="...", level=1)
create_table(rows=3, columns=4)

# Content Controls
api('create.contentControl',
    kind='block',
    type='richText',
    text='content',
    tag='my-tag',
    lockMode='sdtContentLocked'  # unlocked, sdtLocked, contentLocked, sdtContentLocked
)
content_controls_list()
content_controls_select_by_tag("tag")

# Query
blocks_list()
comments_list()

# Format
format_apply(target, bold=True, italic=True)

# Generic (any operation)
api("operation.id", param=value)
```

## Targets

```python
# Get from blocks_list()
blocks = blocks_list()['blocks']
target = {"kind": "blockId", "nodeType": "paragraph", "nodeId": blocks[0]['nodeId']}

# Or use returned 'target' field
cc = content_controls_list()['items'][0]
target = cc['target']
```

## Regenerating Operations

When SuperDoc updates, regenerate the operations list:
```bash
pnpm run generate
```

## Notes

- Documents are in-memory only until `export()` is called
- SuperDoc telemetry messages are filtered out automatically
- Backend auto-creates blank document if none open

## Dependencies

- Python 3.x
- Node.js with `npx tsx`
- `pnpm install` for Node dependencies
