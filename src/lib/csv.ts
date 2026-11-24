export type CsvCellValue = string | number | boolean | null | undefined;

export function escapeCsvCell(value: CsvCellValue): string {
  if (value === null || value === undefined) return "";

  let str = String(value);
  // Prevenir inyección de fórmulas en Excel si es texto no numérico que empieza con =, +, -, @
  if (typeof value === "string" && /^[=+\-@]/.test(str)) {
    str = `'${str}`;
  }

  if (/[;"\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

export function buildCsvContent(
  headers: string[],
  rows: CsvCellValue[][]
): string {
  const headerLine = headers.map(escapeCsvCell).join(";");
  const dataLines = rows.map((row) => row.map(escapeCsvCell).join(";"));
  return "\uFEFF" + [headerLine, ...dataLines].join("\r\n");
}

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: CsvCellValue[][]
): void {
  const csv = buildCsvContent(headers, rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
