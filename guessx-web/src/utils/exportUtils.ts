// Multi-format Enterprise Export Utility for Guess X Platform
// Supports CSV (UTF-8 BOM), SpreadsheetML (Excel XLSX/XLS), and UNCITRAL/ICC Printable PDF/HTML

export interface PdfExportOptions {
  title: string;
  subtitle?: string;
  reportCode?: string;
  metadata?: Array<{ label: string; value: string | number }>;
  summaryKpis?: Array<{ label: string; value: string | number; color?: string }>;
  headers: string[];
  rows: (string | number | boolean | null | undefined)[][];
  legalDisclaimer?: string;
  revenueBreakdown?: {
    winning_amount: number;
    platform_share: number;
    tax: number;
    commission: number;
    net_to_seller: number;
  };
}

export async function exportToCsv(
  filename: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][],
  summaryNotes?: string[],
): Promise<boolean> {
  const escapeCsv = (val: any) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = headers.map(escapeCsv).join(',');
  const rowLines = rows.map((r) => r.map(escapeCsv).join(','));
  const allLines = [headerLine, ...rowLines];

  if (summaryNotes && summaryNotes.length > 0) {
    allLines.push('');
    allLines.push('# Compliance & Summary Notes');
    summaryNotes.forEach((note) => allLines.push(`# ${note}`));
  }

  // Prepend UTF-8 BOM so Excel opens Ethiopian characters and formatting correctly
  const csvContent = '\uFEFF' + allLines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  return downloadBlob(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
}

export async function exportToXlsx(
  filename: string,
  sheetName: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][],
  summary?: Array<{ label: string; value: string | number }>,
) {
  const cleanSheetName = sheetName.replace(/[:\\/?*\[\]]/g, ' ').slice(0, 31);

  let xmlRows = '';

  // Header row
  xmlRows += '<Row ss:StyleID="HeaderStyle">\n';
  for (const h of headers) {
    xmlRows += `  <Cell><Data ss:Type="String">${escapeXml(String(h))}</Data></Cell>\n`;
  }
  xmlRows += '</Row>\n';

  // Data rows
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const styleId = i % 2 === 0 ? 'DataRowEven' : 'DataRowOdd';
    xmlRows += `<Row ss:StyleID="${styleId}">\n`;
    for (const cell of row) {
      if (typeof cell === 'number') {
        xmlRows += `  <Cell><Data ss:Type="Number">${cell}</Data></Cell>\n`;
      } else {
        xmlRows += `  <Cell><Data ss:Type="String">${escapeXml(cell == null ? '' : String(cell))}</Data></Cell>\n`;
      }
    }
    xmlRows += '</Row>\n';
  }

  // Summary rows
  if (summary && summary.length > 0) {
    xmlRows += '<Row></Row>\n';
    xmlRows += '<Row ss:StyleID="SummaryHeader">\n';
    xmlRows += '  <Cell ss:MergeAcross="1"><Data ss:Type="String">Audit & Revenue Summary</Data></Cell>\n';
    xmlRows += '</Row>\n';
    for (const s of summary) {
      xmlRows += '<Row>\n';
      xmlRows += `  <Cell><Data ss:Type="String">${escapeXml(s.label)}</Data></Cell>\n`;
      if (typeof s.value === 'number') {
        xmlRows += `  <Cell><Data ss:Type="Number">${s.value}</Data></Cell>\n`;
      } else {
        xmlRows += `  <Cell><Data ss:Type="String">${escapeXml(String(s.value))}</Data></Cell>\n`;
      }
      xmlRows += '</Row>\n';
    }
  }

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#1D1D1F"/>
  </Style>
  <Style ss:ID="HeaderStyle">
   <Alignment ss:Vertical="Center" ss:Horizontal="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0B192C" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="DataRowEven">
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="DataRowOdd">
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="SummaryHeader">
   <Font ss:FontName="Segoe UI" ss:Size="11" ss:Bold="1" ss:Color="#0B192C"/>
   <Interior ss:Color="#FEF08A" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${escapeXml(cleanSheetName)}">
  <Table ss:DefaultRowHeight="20">
   ${xmlRows}
  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  return downloadBlob(blob, filename.endsWith('.xls') || filename.endsWith('.xlsx') ? filename : `${filename}.xls`);
}

export function exportToPdf(options: PdfExportOptions) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to generate and print PDF reports.');
    return;
  }

  const {
    title,
    subtitle,
    reportCode = `TL-AUDIT-${Date.now().toString().slice(-6)}`,
    metadata = [],
    summaryKpis = [],
    headers,
    rows,
    legalDisclaimer,
    revenueBreakdown,
  } = options;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeXml(title)}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 12mm 15mm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 24px;
      font-size: 11px;
      line-height: 1.4;
    }
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0b192c;
      padding-bottom: 14px;
      margin-bottom: 18px;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 800;
      color: #0b192c;
      letter-spacing: -0.5px;
      margin: 0;
    }
    .brand-subtitle {
      font-size: 11px;
      color: #64748b;
      margin-top: 4px;
      font-weight: 500;
    }
    .report-code-badge {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 6px 12px;
      border-radius: 6px;
      text-align: right;
    }
    .report-code-badge .code {
      font-family: monospace;
      font-weight: 700;
      font-size: 12px;
      color: #0b192c;
    }
    .report-code-badge .date {
      font-size: 10px;
      color: #64748b;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 16px;
      background: #f8fafc;
      padding: 12px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .meta-item .label {
      font-size: 9.5px;
      text-transform: uppercase;
      font-weight: 700;
      color: #64748b;
    }
    .meta-item .val {
      font-size: 11.5px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 2px;
    }
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 10px;
      margin-bottom: 18px;
    }
    .kpi-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .kpi-card .kpi-label {
      font-size: 9.5px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
    }
    .kpi-card .kpi-val {
      font-size: 15px;
      font-weight: 800;
      color: #0b192c;
      margin-top: 3px;
    }
    .revenue-card {
      background: #fefce8;
      border: 1px solid #fde047;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 18px;
    }
    .revenue-title {
      font-size: 11px;
      font-weight: 800;
      color: #854d0e;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .revenue-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
    }
    .table-container {
      margin-top: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    th {
      background: #0b192c;
      color: #ffffff;
      font-weight: 700;
      text-align: left;
      padding: 7px 8px;
      border: 1px solid #0b192c;
    }
    td {
      padding: 6px 8px;
      border: 1px solid #e2e8f0;
      color: #334155;
    }
    tr:nth-child(even) td {
      background: #f8fafc;
    }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 9px;
    }
    .footer {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #94a3b8;
      font-size: 9px;
    }
    .print-actions {
      margin-bottom: 16px;
      display: flex;
      gap: 8px;
    }
    .btn {
      background: #0b192c;
      color: #fff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 700;
      cursor: pointer;
    }
    @media print {
      .print-actions { display: none; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="print-actions">
    <button class="btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
  </div>

  <div class="header-bar">
    <div>
      <h1 class="brand-title">Guess X — Official Audit & Transaction Slip</h1>
      <p class="brand-subtitle">${escapeXml(subtitle || 'International Auction Compliance & Revenue Sharing Ledger')}</p>
    </div>
    <div class="report-code-badge">
      <div class="code">${escapeXml(reportCode)}</div>
      <div class="date">Generated: ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
    </div>
  </div>

  ${metadata.length > 0 ? `
    <div class="meta-grid">
      ${metadata.map((m) => `
        <div class="meta-item">
          <div class="label">${escapeXml(m.label)}</div>
          <div class="val">${escapeXml(String(m.value))}</div>
        </div>
      `).join('')}
    </div>
  ` : ''}

  ${revenueBreakdown ? `
    <div class="revenue-card">
      <div class="revenue-title">Automated Revenue Sharing & Tax Settlement Breakdown</div>
      <div class="revenue-grid">
        <div><strong>Winning Bid:</strong> ETB ${revenueBreakdown.winning_amount.toFixed(2)}</div>
        <div><strong>Platform Share (10%):</strong> ETB ${revenueBreakdown.platform_share.toFixed(2)}</div>
        <div><strong>VAT Withheld (15%):</strong> ETB ${revenueBreakdown.tax.toFixed(2)}</div>
        <div><strong>Commission (5%):</strong> ETB ${revenueBreakdown.commission.toFixed(2)}</div>
        <div><strong style="color: #15803d;">Net to Seller:</strong> ETB ${revenueBreakdown.net_to_seller.toFixed(2)}</div>
      </div>
    </div>
  ` : ''}

  ${summaryKpis.length > 0 ? `
    <div class="kpi-row">
      ${summaryKpis.map((k) => `
        <div class="kpi-card">
          <div class="kpi-label">${escapeXml(k.label)}</div>
          <div class="kpi-val" ${k.color ? `style="color: ${k.color};"` : ''}>${escapeXml(String(k.value))}</div>
        </div>
      `).join('')}
    </div>
  ` : ''}

  <div class="table-container">
    <table>
      <thead>
        <tr>
          ${headers.map((h) => `<th>${escapeXml(h)}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${rows.map((row) => `
          <tr>
            ${row.map((cell) => `<td>${escapeXml(cell == null ? '—' : String(cell))}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="footer">
    <div>
      ${escapeXml(legalDisclaimer || 'Compliant with UNCITRAL Model Law on Public Procurement Article 37 & ICC Rules for Commercial Auctions. Read-Only Immutable Audit Trail.')}
    </div>
    <div>Page 1 of 1 • Guess X Enterprise Governance</div>
  </div>

  <script>
    window.addEventListener('load', () => {
      // Auto trigger print dialog after document is fully loaded
      setTimeout(() => { window.print(); }, 400);
    });
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

export async function downloadBlob(blob: Blob, filename: string): Promise<boolean> {
  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      const ext = filename.split('.').pop()?.toLowerCase() || '';
      let accept: Record<string, string[]> = {};
      if (ext === 'csv') {
        accept = { 'text/csv': ['.csv'] };
      } else if (ext === 'xls') {
        accept = { 'application/vnd.ms-excel': ['.xls'] };
      } else if (ext === 'xlsx') {
        accept = {
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
          'application/vnd.ms-excel': ['.xls'],
        };
      } else {
        accept = { [blob.type || 'application/octet-stream']: [`.${ext}`] };
      }

      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: `${ext.toUpperCase()} File`,
            accept,
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.code === 20) {
        return false;
      }
    }
  }

  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return true;
  } catch {
    return false;
  }
}

export async function copyCsvToClipboard(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][],
): Promise<boolean> {
  try {
    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes('\t') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    const headerLine = headers.map(escapeCsv).join('\t');
    const rowLines = rows.map((r) => r.map(escapeCsv).join('\t'));
    const tsvContent = [headerLine, ...rowLines].join('\r\n');
    await navigator.clipboard.writeText(tsvContent);
    return true;
  } catch {
    return false;
  }
}

function escapeXml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
