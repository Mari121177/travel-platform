// Minimal CSV parser (RFC 4180 style): quoted fields, escaped quotes (""),
// commas and line breaks inside quotes, CRLF or LF line endings, UTF-8 BOM.
export function parseCsv(text: string): string[][] {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src.charAt(i);
    if (inQuotes) {
      if (ch === '"') {
        if (src.charAt(i + 1) === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src.charAt(i + 1) === '\n') {
        i++;
      }
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  // Last line without a trailing line break
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Drop blank lines
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

// First line is the header. Returns one object per data row, keyed by header name.
export function parseCsvObjects(text: string): {
  header: string[];
  rows: Record<string, string>[];
} {
  const [headerRow, ...dataRows] = parseCsv(text);
  if (!headerRow) {
    return { header: [], rows: [] };
  }
  const header = headerRow.map((h) => h.trim());
  const rows = dataRows.map((cells) => {
    const obj: Record<string, string> = {};
    header.forEach((name, index) => {
      obj[name] = (cells[index] ?? '').trim();
    });
    return obj;
  });
  return { header, rows };
}