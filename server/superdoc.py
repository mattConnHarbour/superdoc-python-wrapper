#!/usr/bin/env python3
"""
SuperDoc - Python library for document manipulation.

Spawns a Node.js backend subprocess and communicates via stdin/stdout.
No HTTP server needed.

Usage:
    from superdoc import open, create_paragraph, info, blocks_list

    open()  # or open("/path/to/doc.docx")
    create_paragraph(text="Hello, World!")
    create_heading(text="My Title", level=1)
    print(blocks_list())
    export("/path/to/output.docx")
"""

import json
import subprocess
import sys
import os
import atexit
from typing import Any, Optional, Dict, List

# Find the backend script relative to this file
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_BACKEND_SCRIPT = os.path.join(_SCRIPT_DIR, 'superdoc-backend.ts')

# Global subprocess
_process: Optional[subprocess.Popen] = None


def _ensure_backend():
    """Start the backend subprocess if not running."""
    global _process

    if _process is not None and _process.poll() is None:
        return  # Already running

    # Find npx/tsx
    _process = subprocess.Popen(
        ['npx', 'tsx', _BACKEND_SCRIPT],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1,  # Line buffered
        cwd=_SCRIPT_DIR,
    )

    # Wait for ready signal
    line = _process.stdout.readline()
    if not line:
        stderr = _process.stderr.read()
        raise RuntimeError(f"Backend failed to start: {stderr}")

    try:
        msg = json.loads(line)
        if not msg.get('ready'):
            raise RuntimeError(f"Unexpected startup message: {msg}")
    except json.JSONDecodeError:
        raise RuntimeError(f"Invalid startup message: {line}")


def _cleanup():
    """Clean up the backend subprocess on exit."""
    global _process
    if _process is not None:
        _process.terminate()
        try:
            _process.wait(timeout=2)
        except subprocess.TimeoutExpired:
            _process.kill()
        _process = None


atexit.register(_cleanup)


def _send(method: str, **params) -> Any:
    """Send a command to the backend and return the result."""
    _ensure_backend()

    cmd = json.dumps({"method": method, "params": params})
    _process.stdin.write(cmd + '\n')
    _process.stdin.flush()

    # Read lines until we get valid JSON (skip telemetry messages)
    while True:
        line = _process.stdout.readline()
        if not line:
            raise RuntimeError("Backend closed unexpectedly")

        line = line.strip()
        if not line or not line.startswith('{'):
            continue  # Skip non-JSON lines (like telemetry messages)

        try:
            response = json.loads(line)
            break
        except json.JSONDecodeError:
            continue  # Skip malformed lines

    if 'error' in response:
        raise RuntimeError(response['error'])

    return response.get('result')


def _invoke(operation_id: str, **kwargs) -> Any:
    """Invoke a SuperDoc operation."""
    return _send('invoke', operationId=operation_id, input=kwargs)


# =============================================================================
# Document Management
# =============================================================================

def open(path: Optional[str] = None) -> Dict[str, Any]:
    """Open a document. If path is None, creates a blank document."""
    return _send('open', path=path)


def reset() -> Dict[str, Any]:
    """Reset the session and close the current document."""
    return _send('reset')


def export(path: Optional[str] = None) -> Dict[str, Any]:
    """Export the document. If path given, saves to file. Otherwise returns base64."""
    return _send('export', path=path)


def info() -> Dict[str, Any]:
    """Get document info and statistics."""
    return _invoke('info')


# =============================================================================
# Block Operations
# =============================================================================

def blocks_list(offset: int = 0, limit: int = 100, include_text: bool = True) -> Dict[str, Any]:
    """List top-level blocks in document order."""
    return _invoke('blocks.list', offset=offset, limit=limit, includeText=include_text)


def blocks_delete(target: Dict[str, Any]) -> Dict[str, Any]:
    """Delete an entire block node."""
    return _invoke('blocks.delete', target=target)


# =============================================================================
# Create Operations
# =============================================================================

def create_paragraph(text: str = "", at: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Create a paragraph at the target position."""
    params: Dict[str, Any] = {}
    if text:
        params['text'] = text
    if at:
        params['at'] = at
    return _invoke('create.paragraph', **params)


def create_heading(text: str = "", level: int = 1, at: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Create a heading at the target position."""
    params: Dict[str, Any] = {'level': level}
    if text:
        params['text'] = text
    if at:
        params['at'] = at
    return _invoke('create.heading', **params)


def create_table(rows: int, columns: int, at: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Create a table at the target position."""
    params: Dict[str, Any] = {'rows': rows, 'columns': columns}
    if at:
        params['at'] = at
    return _invoke('create.table', **params)


def create_image(src: str, at: Optional[Dict[str, Any]] = None, width: Optional[int] = None, height: Optional[int] = None) -> Dict[str, Any]:
    """Insert an image at the target position."""
    params: Dict[str, Any] = {'src': src}
    if at:
        params['at'] = at
    if width:
        params['width'] = width
    if height:
        params['height'] = height
    return _invoke('create.image', **params)


# =============================================================================
# Comments
# =============================================================================

def comments_list() -> Dict[str, Any]:
    """List all comments in the document."""
    return _invoke('comments.list')


def comments_create(target: Dict[str, Any], text: str, author: Optional[str] = None) -> Dict[str, Any]:
    """Create a new comment."""
    params: Dict[str, Any] = {'target': target, 'text': text}
    if author:
        params['author'] = author
    return _invoke('comments.create', **params)


def comments_delete(id: str) -> Dict[str, Any]:
    """Delete a comment by ID."""
    return _invoke('comments.delete', id=id)


# =============================================================================
# Format Operations
# =============================================================================

def format_apply(target: Dict[str, Any], bold: Optional[bool] = None, italic: Optional[bool] = None,
                 underline: Optional[bool] = None, strike: Optional[bool] = None,
                 highlight: Optional[str] = None, color: Optional[str] = None,
                 font_size: Optional[int] = None, font_family: Optional[str] = None) -> Dict[str, Any]:
    """Apply inline formatting to a target range."""
    params: Dict[str, Any] = {'target': target}
    if bold is not None:
        params['bold'] = bold
    if italic is not None:
        params['italic'] = italic
    if underline is not None:
        params['underline'] = underline
    if strike is not None:
        params['strike'] = strike
    if highlight:
        params['highlight'] = highlight
    if color:
        params['color'] = color
    if font_size:
        params['fontSize'] = font_size
    if font_family:
        params['fontFamily'] = font_family
    return _invoke('format.apply', **params)


# =============================================================================
# Content Controls
# =============================================================================

def content_controls_list(type: Optional[str] = None, tag: Optional[str] = None) -> Dict[str, Any]:
    """List all content controls in the document."""
    params: Dict[str, Any] = {}
    if type:
        params['type'] = type
    if tag:
        params['tag'] = tag
    return _invoke('contentControls.list', **params)


def content_controls_get(target: Dict[str, Any]) -> Dict[str, Any]:
    """Get a content control by target."""
    return _invoke('contentControls.get', target=target)


def content_controls_replace_content(target: Dict[str, Any], content: str) -> Dict[str, Any]:
    """Replace the content of a content control."""
    return _invoke('contentControls.replaceContent', target=target, content=content)


def content_controls_checkbox_toggle(target: Dict[str, Any]) -> Dict[str, Any]:
    """Toggle a checkbox content control."""
    return _invoke('contentControls.checkbox.toggle', target=target)


def content_controls_text_set_value(target: Dict[str, Any], value: str) -> Dict[str, Any]:
    """Set the text value of a plain-text content control."""
    return _invoke('contentControls.text.setValue', target=target, value=value)


def content_controls_select_by_tag(tag: str) -> Dict[str, Any]:
    """Select content controls by tag."""
    return _invoke('contentControls.selectByTag', tag=tag)


# =============================================================================
# Tables
# =============================================================================

def tables_insert_row(target: Dict[str, Any], position: str = "after") -> Dict[str, Any]:
    """Insert a row in a table."""
    return _invoke('tables.insertRow', target=target, position=position)


def tables_insert_column(target: Dict[str, Any], position: str = "after") -> Dict[str, Any]:
    """Insert a column in a table."""
    return _invoke('tables.insertColumn', target=target, position=position)


def tables_delete_row(target: Dict[str, Any]) -> Dict[str, Any]:
    """Delete a row from a table."""
    return _invoke('tables.deleteRow', target=target)


def tables_delete_column(target: Dict[str, Any]) -> Dict[str, Any]:
    """Delete a column from a table."""
    return _invoke('tables.deleteColumn', target=target)


def tables_merge_cells(target: Dict[str, Any]) -> Dict[str, Any]:
    """Merge table cells."""
    return _invoke('tables.mergeCells', target=target)


def tables_set_cell_text(target: Dict[str, Any], text: str) -> Dict[str, Any]:
    """Set the text of a table cell."""
    return _invoke('tables.setCellText', target=target, text=text)


# =============================================================================
# History
# =============================================================================

def history_undo() -> Dict[str, Any]:
    """Undo the last action."""
    return _invoke('history.undo')


def history_redo() -> Dict[str, Any]:
    """Redo the last undone action."""
    return _invoke('history.redo')


# =============================================================================
# Hyperlinks & Bookmarks
# =============================================================================

def hyperlinks_list() -> Dict[str, Any]:
    """List all hyperlinks in the document."""
    return _invoke('hyperlinks.list')


def hyperlinks_insert(target: Dict[str, Any], url: str, text: Optional[str] = None) -> Dict[str, Any]:
    """Insert a hyperlink."""
    params: Dict[str, Any] = {'target': target, 'url': url}
    if text:
        params['text'] = text
    return _invoke('hyperlinks.insert', **params)


def bookmarks_list() -> Dict[str, Any]:
    """List all bookmarks in the document."""
    return _invoke('bookmarks.list')


def bookmarks_insert(target: Dict[str, Any], name: str) -> Dict[str, Any]:
    """Insert a bookmark."""
    return _invoke('bookmarks.insert', target=target, name=name)


# =============================================================================
# Generic API
# =============================================================================

def api(operation_id: str, **kwargs) -> Any:
    """Call any SuperDoc operation directly."""
    return _invoke(operation_id, **kwargs)


# =============================================================================
# Help
# =============================================================================

def help(topic: Optional[str] = None) -> str:
    """Show help for SuperDoc API."""
    if topic:
        return f"Use api('{topic}', ...) or see the function docstring."

    return """SuperDoc Python API (Standalone)

DOCUMENT:
    open(path=None)              Open document (None for blank)
    reset()                      Reset session
    export(path=None)            Export to file or get base64
    info()                       Document statistics

CREATE:
    create_paragraph(text, at)   Create paragraph
    create_heading(text, level)  Create heading (level 1-6)
    create_table(rows, columns)  Create table
    create_image(src, at)        Insert image

BLOCKS:
    blocks_list()                List all blocks
    blocks_delete(target)        Delete a block

FORMAT:
    format_apply(target, bold=True, italic=True, ...)

CONTENT CONTROLS:
    content_controls_list()
    content_controls_replace_content(target, content)
    content_controls_checkbox_toggle(target)
    content_controls_select_by_tag(tag)

TABLES:
    tables_insert_row(target)
    tables_insert_column(target)
    tables_set_cell_text(target, text)

HISTORY:
    history_undo()
    history_redo()

GENERIC:
    api(operation_id, **kwargs)  Call any operation

TARGETS:
    Use blocks_list() to find block IDs, then:
    {"kind": "blockId", "nodeType": "paragraph", "nodeId": "..."}
"""


# =============================================================================
# Interactive Mode
# =============================================================================

if __name__ == "__main__":
    import code

    # Create a banner
    banner = """SuperDoc Python REPL

Type help() for available commands.
Example:
    open()
    create_paragraph(text="Hello!")
    print(blocks_list())
    export("output.docx")
"""

    # Start interactive console with all functions available
    console_vars = {
        name: obj for name, obj in globals().items()
        if not name.startswith('_') and callable(obj)
    }
    console_vars['help'] = help

    code.interact(banner=banner, local=console_vars)
