import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rows = body.finalRows ?? body.rows ?? [];
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: 'No data to export. Run the report first.' },
        { status: 400 }
      );
    }

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Fringe Rate Report', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    const headers = [
      'Employee Name',
      'TSheets User ID',
      'ADP Employee ID (File #)',
      'Pay Item Name',
      'Pay Item Amount',
      'Total Worked Hours',
      'Fringe Hourly Rate',
    ];
    ws.addRow(headers);
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { wrapText: true };
    headerRow.height = 30;

    const currencyFmt = '$#,##0.00000000';
    const totalRowFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE5E5E5' },
    };
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rowNum = i + 2;
      const isTotalRow = r.atomName === 'Total';
      ws.addRow([
        r.employeeName ?? '',
        r.userId ?? '',
        r.employeeId ?? '',
        r.atomName ?? '',
        r.atomAmount != null && r.atomAmount !== '' ? parseFloat(r.atomAmount) : '',
        r.totalHours ?? '',
        r.hourlyRate != null && r.hourlyRate !== '' ? parseFloat(r.hourlyRate) : '',
      ]);
      const payItemAmountCell = ws.getCell(rowNum, 5);
      const totalHoursCell = ws.getCell(rowNum, 6);
      const hourlyRateCell = ws.getCell(rowNum, 7);
      if (payItemAmountCell.value != null && payItemAmountCell.value !== '') {
        payItemAmountCell.numFmt = currencyFmt;
      }
      if (totalHoursCell.value != null && totalHoursCell.value !== '') {
        totalHoursCell.numFmt = '#,##0.00';
      }
      if (hourlyRateCell.value != null && hourlyRateCell.value !== '') {
        hourlyRateCell.numFmt = currencyFmt;
      }
      if (isTotalRow) {
        for (let col = 1; col <= 7; col++) {
          ws.getCell(rowNum, col).fill = totalRowFill;
        }
      }
    }

    const buffer = await wb.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="fringe-rate-report-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || 'Export failed' },
      { status: 500 }
    );
  }
}
