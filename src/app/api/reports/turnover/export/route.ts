import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { getTurnoverReport, type TurnoverReport } from "@/lib/report";
import { requireSessionUser } from "@/lib/session";
import { turnoverQuerySchema } from "@/lib/validation";

const CSV_HEADER = ["Client", "Balance at start", "Invoiced", "Paid", "Net change", "Balance at end"];

function toMajorUnits(amountMinor: number): string {
  return (amountMinor / 100).toFixed(2);
}

function csvEscape(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function reportRows(report: TurnoverReport): (string | number)[][] {
  const rows = report.clients.map((c) => [
    c.clientName,
    toMajorUnits(c.balanceAtStart),
    toMajorUnits(c.totalInvoiced),
    toMajorUnits(c.totalPaid),
    toMajorUnits(c.netChange),
    toMajorUnits(c.balanceAtEnd),
  ]);
  rows.push([
    "TOTAL",
    toMajorUnits(report.balanceAtStart),
    toMajorUnits(report.totalInvoiced),
    toMajorUnits(report.totalPaid),
    toMajorUnits(report.netChange),
    toMajorUnits(report.balanceAtEnd),
  ]);
  return rows;
}

function toCsv(report: TurnoverReport): string {
  const lines = [CSV_HEADER, ...reportRows(report)].map((row) => row.map((cell) => csvEscape(String(cell))).join(","));
  return `﻿${lines.join("\r\n")}`;
}

async function toXlsx(report: TurnoverReport): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Turnover");
  sheet.addRow(CSV_HEADER).font = { bold: true };
  for (const row of reportRows(report)) sheet.addRow(row);
  sheet.getRow(sheet.rowCount).font = { bold: true };
  sheet.columns.forEach((column) => {
    column.width = 20;
  });
  return workbook.xlsx.writeBuffer();
}

export async function GET(request: Request) {
  const user = await requireSessionUser(request);
  if (user instanceof NextResponse) return user;

  const url = new URL(request.url);
  const parsed = turnoverQuerySchema.safeParse({
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    clientId: url.searchParams.get("clientId") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "'from' and 'to' (YYYY-MM-DD) are required" }, { status: 400 });
  }

  const format = url.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
  const report = await getTurnoverReport(parsed.data);
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const filenameBase = `turnover-${fromParam}-${toParam}`;

  if (format === "csv") {
    return new NextResponse(toCsv(report), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filenameBase}.csv"`,
      },
    });
  }

  const buffer = await toXlsx(report);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filenameBase}.xlsx"`,
    },
  });
}
