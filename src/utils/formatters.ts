import { jsPDF } from 'jspdf';
import { Order, OrderItem, TaxSettings } from '../types/index.ts';

export function formatCurrency(amount: number | string | undefined | null): string {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string | undefined | null): string {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function formatTime(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

export function generateOrderPdf(
  order: Order,
  type: 'Invoice' | 'Receipt' | 'Packing Slip',
  settings: TaxSettings
) {
  const doc = new jsPDF({
    unit: 'pt',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 612 pt
  const pageHeight = doc.internal.pageSize.getHeight(); // 792 pt
  const leftMargin = 36;
  const rightMargin = pageWidth - 36; // 576 pt
  const contentWidth = rightMargin - leftMargin; // 540 pt

  const isPackingSlip = type === 'Packing Slip';
  const isReceipt = type === 'Receipt';

  // Helper to draw clean branded page header
  const drawPageHeader = (pageNumber: number) => {
    // Top banner
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 72, 'F');

    // Accent line
    doc.setFillColor(245, 158, 11); // amber-500
    doc.rect(0, 72, pageWidth, 3.5, 'F');

    // Brand info on left
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text((settings.company_name || 'CASA CENTRAL STORE').toUpperCase(), leftMargin, 26);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(226, 232, 240); // slate-200
    doc.text('Appliances & Electronics Asset-Recovery Specialists', leftMargin, 39);

    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    const addrLine = [
      settings.company_address || '1420 Bergenline Avenue',
      settings.company_city_state_zip || 'Union City, NJ 07087',
    ].filter(Boolean).join(', ');
    doc.text(addrLine, leftMargin, 51);

    const contactLine = [
      settings.company_phone ? `Tel: ${settings.company_phone}` : null,
      settings.company_email ? `Email: ${settings.company_email}` : null,
    ].filter(Boolean).join('   |   ');
    doc.text(contactLine, leftMargin, 62);

    // Document Type Header on right
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(251, 191, 36); // amber-400
    const docTypeLabel = type.toUpperCase();
    doc.text(docTypeLabel, rightMargin, 26, { align: 'right' });

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`Order #: ${order.order_number}`, rightMargin, 42, { align: 'right' });

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(203, 213, 225); // slate-300
    const dateAndPage = `Date: ${formatDate(order.transaction_date)}${pageNumber > 1 ? `  |  Page ${pageNumber}` : ''}`;
    doc.text(dateAndPage, rightMargin, 56, { align: 'right' });
  };

  drawPageHeader(1);

  // ----------------------------------------------------
  // Customer & Fulfillment Box (Two non-overlapping columns)
  // ----------------------------------------------------
  let y = 88;
  const cardHeight = 84;
  const colGap = 16;
  const colWidth = (contentWidth - colGap) / 2; // 262 pt
  const leftColX = leftMargin; // 36 pt
  const rightColX = leftMargin + colWidth + colGap; // 314 pt

  // Card background & border
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.75);
  doc.roundedRect(leftMargin, y, contentWidth, cardHeight, 4, 4, 'FD');

  // Vertical subtle separator between columns
  doc.setDrawColor(226, 232, 240);
  doc.line(leftColX + colWidth + colGap / 2, y + 8, leftColX + colWidth + colGap / 2, y + cardHeight - 8);

  // LEFT COLUMN: Customer / Bill To
  const custPadX = leftColX + 12;
  const custMaxW = colWidth - 24; // 238 pt
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('CUSTOMER / BILL & SHIP TO', custPadX, y + 15);

  const cust = order.customer;
  const custName = (cust?.display_name || 'Walk-in Customer').trim();
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42); // slate-900
  const nameTruncated = doc.splitTextToSize(custName, custMaxW)[0] || custName;
  doc.text(nameTruncated, custPadX, y + 29);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85); // slate-700
  const custPhone = cust?.phone || 'No phone on file';
  doc.text(`Tel: ${custPhone}`, custPadX, y + 41);

  if (cust?.email) {
    const emailTruncated = doc.splitTextToSize(cust.email, custMaxW)[0] || cust.email;
    doc.text(`Email: ${emailTruncated}`, custPadX, y + 52);
  } else {
    doc.text('Email: N/A', custPadX, y + 52);
  }

  const custAddr = cust?.address
    ? `${cust.address}, ${cust.city || ''} ${cust.state || ''} ${cust.zip || ''}`.trim()
    : 'Store showroom pickup';
  const addressLines = doc.splitTextToSize(custAddr, custMaxW);
  doc.text(addressLines[0] || custAddr, custPadX, y + 63);

  if (order.tax_exempt) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text('✔ TAX EXEMPT (Resale Certificate ST-3 on File)', custPadX, y + 74);
  }

  // RIGHT COLUMN: Transaction & Fulfillment
  const rightPadX = rightColX + 12;
  const rightMaxW = colWidth - 24;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('ORDER & FULFILLMENT DETAILS', rightPadX, y + 15);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(`Order Date: ${formatDate(order.transaction_date)}`, rightPadX, y + 28);

  const logisticsLabel = `Fulfillment: ${order.logistics_method || 'Pick Up'}`;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(logisticsLabel, rightPadX, y + 40);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  if (order.logistics_method === 'Delivery') {
    const destAddr = order.delivery_address || cust?.address || 'Scheduled delivery';
    const destLine = doc.splitTextToSize(`Dest: ${destAddr}`, rightMaxW)[0] || destAddr;
    doc.text(destLine, rightPadX, y + 51);
    const delivInfo = `Status: ${order.delivery_status || 'Scheduled'}${order.driver_name ? ` | Driver: ${order.driver_name}` : ''}`;
    doc.text(delivInfo, rightPadX, y + 62);
  } else {
    const pickupDateStr = order.scheduled_pickup_date ? formatDate(order.scheduled_pickup_date) : 'Today';
    doc.text(`Scheduled Pickup: ${pickupDateStr}`, rightPadX, y + 51);
    doc.text(`Pickup Status: ${order.pickup_status || 'Scheduled'}`, rightPadX, y + 62);
  }

  const metaSummary = `Payment: ${order.payment_method || 'Cash'}   |   Rep: ${order.sales_rep_name || 'Staff'}`;
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(metaSummary, rightPadX, y + 74);

  y += cardHeight + 14; // Advance below customer card

  // ----------------------------------------------------
  // Table Column Definitions with exact widths (No Condition column)
  // ----------------------------------------------------
  const invoiceCols = {
    num: { x: 38, width: 24 },
    sku: { x: 62, width: 96 },
    desc: { x: 158, width: 254 },
    qty: { x: 418, width: 28 },
    price: { x: 448, width: 56 },
    total: { x: 508, width: 68 },
  };

  const packingSlipCols = {
    num: { x: 38, width: 24 },
    sku: { x: 62, width: 110 },
    desc: { x: 172, width: 326 },
    qty: { x: 504, width: 68 },
  };

  const drawTableHeader = (headerY: number) => {
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(leftMargin, headerY, contentWidth, 20, 'F');
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.75);
    doc.line(leftMargin, headerY + 20, rightMargin, headerY + 20);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59); // slate-800
    doc.setFontSize(7.5);

    if (isPackingSlip) {
      doc.text('#', packingSlipCols.num.x, headerY + 13);
      doc.text('SKU / MODEL', packingSlipCols.sku.x, headerY + 13);
      doc.text('DESCRIPTION & DETAILS', packingSlipCols.desc.x, headerY + 13);
      doc.text('QTY', rightMargin - 6, headerY + 13, { align: 'right' });
    } else {
      doc.text('#', invoiceCols.num.x, headerY + 13);
      doc.text('SKU / MODEL', invoiceCols.sku.x, headerY + 13);
      doc.text('DESCRIPTION & DETAILS', invoiceCols.desc.x, headerY + 13);
      doc.text('QTY', invoiceCols.qty.x + invoiceCols.qty.width / 2, headerY + 13, { align: 'center' });
      doc.text('PRICE', invoiceCols.price.x + invoiceCols.price.width - 2, headerY + 13, { align: 'right' });
      doc.text('TOTAL', rightMargin - 4, headerY + 13, { align: 'right' });
    }
  };

  drawTableHeader(y);
  y += 24;

  let currentPage = 1;
  let lineCount = 1;
  const items = order.items || [];

  for (const item of items) {
    const descColW = isPackingSlip ? packingSlipCols.desc.width : invoiceCols.desc.width;
    const skuColW = isPackingSlip ? packingSlipCols.sku.width : invoiceCols.sku.width;

    // 1. Calculate text wraps and exact height needed
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const descLines: string[] = doc.splitTextToSize(item.description || 'General Merchandise', descColW);

    // Secondary asset details line: Serial Number only (Condition, Item Tag, Location omitted)
    const detailsStr = item.serial_number && item.serial_number.trim()
      ? `S/N: ${item.serial_number.trim()}`
      : '';
    doc.setFontSize(7);
    const detailsLines: string[] = detailsStr ? doc.splitTextToSize(detailsStr, descColW) : [];

    // SKU
    doc.setFontSize(7.5);
    const skuLines: string[] = doc.splitTextToSize(item.sku || '-', skuColW - 4);

    // Calculate vertical heights
    const descHeight = descLines.length * 10;
    const detailsHeight = detailsLines.length > 0 ? detailsLines.length * 8.5 + 2 : 0;
    const primaryDescBlock = descHeight + detailsHeight;
    const skuBlock = skuLines.length * 9.5;
    const contentHeight = Math.max(primaryDescBlock, skuBlock, 14);
    const rowHeight = contentHeight + 10; // 5pt top and 5pt bottom padding

    // Page overflow check
    const bottomThreshold = isPackingSlip ? pageHeight - 85 : pageHeight - 195;
    if (y + rowHeight > bottomThreshold) {
      doc.addPage();
      currentPage++;
      drawPageHeader(currentPage);
      y = 86;
      drawTableHeader(y);
      y += 24;
    }

    const rowTopY = y;
    const textBaseline = rowTopY + 9;

    if (isPackingSlip) {
      // Line Number
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(String(lineCount++), packingSlipCols.num.x, textBaseline);

      // SKU
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);
      doc.text(skuLines, packingSlipCols.sku.x, textBaseline);

      // Description
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(descLines, packingSlipCols.desc.x, textBaseline);

      if (detailsLines.length > 0) {
        const detailsStartY = textBaseline + descHeight + 1;
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(detailsLines, packingSlipCols.desc.x, detailsStartY);
      }

      // Qty
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(String(item.quantity), rightMargin - 6, textBaseline, { align: 'right' });
    } else {
      // Line Number
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(String(lineCount++), invoiceCols.num.x, textBaseline);

      // SKU
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);
      doc.text(skuLines, invoiceCols.sku.x, textBaseline);

      // Description
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(descLines, invoiceCols.desc.x, textBaseline);

      if (detailsLines.length > 0) {
        const detailsStartY = textBaseline + descHeight + 1;
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(detailsLines, invoiceCols.desc.x, detailsStartY);
      }

      // Qty
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(String(item.quantity), invoiceCols.qty.x + invoiceCols.qty.width / 2, textBaseline, { align: 'center' });

      // Price & Total
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text(formatCurrency(item.unit_price), invoiceCols.price.x + invoiceCols.price.width - 2, textBaseline, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(formatCurrency(item.line_total), rightMargin - 4, textBaseline, { align: 'right' });
    }

    y += rowHeight;

    // Row divider
    doc.setDrawColor(241, 245, 249); // slate-100
    doc.setLineWidth(0.5);
    doc.line(leftMargin, y - 2, rightMargin, y - 2);
  }

  // ----------------------------------------------------
  // Financial Summary & Payments Breakdown (Invoice & Receipt)
  // ----------------------------------------------------
  let financialBoxBottom = y;
  if (!isPackingSlip) {
    if (y + 175 > pageHeight - 50) {
      doc.addPage();
      currentPage++;
      drawPageHeader(currentPage);
      y = 86;
    }
    y += 10;
    const summaryBoxTopY = y;

    // Right side: Financial Breakdown Card
    const boxWidth = 230;
    const boxX = rightMargin - boxWidth; // 346 pt
    let fy = summaryBoxTopY + 14;

    interface SummaryRowItem {
      label: string;
      value: string;
      isBold?: boolean;
      isAccent?: boolean;
      isNegative?: boolean;
    }

    const summaryRows: SummaryRowItem[] = [];
    summaryRows.push({ label: 'Subtotal:', value: formatCurrency(order.subtotal) });
    if (order.shipping_amount > 0) {
      summaryRows.push({ label: 'Shipping / Delivery:', value: formatCurrency(order.shipping_amount) });
    }
    if (order.installation_fee > 0) {
      summaryRows.push({ label: 'Installation Fee:', value: formatCurrency(order.installation_fee) });
    }
    const taxLabel = order.tax_exempt
      ? 'Sales Tax (Exempt):'
      : `Sales Tax (${order.tax_rate ? (order.tax_rate * 100).toFixed(2) : (settings.default_tax_rate * 100).toFixed(2)}%):`;
    summaryRows.push({ label: taxLabel, value: formatCurrency(order.sales_tax) });
    if (order.credit_card_charge > 0) {
      summaryRows.push({ label: 'Credit Card Surcharge (3%):', value: formatCurrency(order.credit_card_charge) });
    }
    if (order.discount > 0) {
      summaryRows.push({ label: 'Discount:', value: `-${formatCurrency(order.discount)}`, isNegative: true });
    }
    if (order.credit > 0) {
      summaryRows.push({ label: 'Store Credit:', value: `-${formatCurrency(order.credit)}`, isNegative: true });
    }

    // Dynamic box height
    const calculatedBoxHeight = 16 + (summaryRows.length * 11.5) + 6 + 13 + 12 + 13 + 10;
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.75);
    doc.roundedRect(boxX, summaryBoxTopY, boxWidth, calculatedBoxHeight, 4, 4, 'FD');

    doc.setFontSize(7.5);
    for (const r of summaryRows) {
      doc.setFont('helvetica', r.isBold ? 'bold' : 'normal');
      if (r.isNegative) {
        doc.setTextColor(225, 29, 72); // rose-600
      } else {
        doc.setTextColor(71, 85, 105); // slate-600
      }
      doc.text(r.label, boxX + 10, fy);
      doc.text(r.value, boxX + boxWidth - 10, fy, { align: 'right' });
      fy += 11.5;
    }

    // Divider before total
    doc.setDrawColor(203, 213, 225);
    doc.line(boxX + 8, fy - 1, boxX + boxWidth - 8, fy - 1);
    fy += 7;

    // INVOICE TOTAL
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('INVOICE TOTAL:', boxX + 10, fy);
    doc.text(formatCurrency(order.invoice_total), boxX + boxWidth - 10, fy, { align: 'right' });
    fy += 12;

    // Amount Paid
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text('Amount Paid:', boxX + 10, fy);
    doc.text(formatCurrency(order.amount_paid), boxX + boxWidth - 10, fy, { align: 'right' });
    fy += 12;

    // BALANCE DUE
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    if (order.balance_due > 0) {
      doc.setTextColor(180, 83, 9); // amber-700
    } else {
      doc.setTextColor(15, 23, 42);
    }
    doc.text('BALANCE DUE:', boxX + 10, fy);
    doc.text(formatCurrency(order.balance_due), boxX + boxWidth - 10, fy, { align: 'right' });

    // LEFT SIDE: If Receipt, render the recorded payment transactions ledger
    if (isReceipt && order.payments && order.payments.length > 0) {
      const payBoxWidth = boxX - leftMargin - 16; // 294 pt
      const payBoxHeight = calculatedBoxHeight;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(leftMargin, summaryBoxTopY, payBoxWidth, payBoxHeight, 4, 4, 'FD');

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('PAYMENT TRANSACTIONS RECORDED', leftMargin + 10, summaryBoxTopY + 14);

      let py = summaryBoxTopY + 26;
      for (const p of order.payments.slice(0, 5)) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(71, 85, 105);
        const refStr = p.reference_number ? ` (Ref: ${p.reference_number})` : '';
        const payLine = `${formatDate(p.payment_date)} - ${p.payment_method}${refStr}`;
        const truncatedPayLine = doc.splitTextToSize(payLine, payBoxWidth - 80)[0] || payLine;
        doc.text(truncatedPayLine, leftMargin + 10, py);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(formatCurrency(p.amount), leftMargin + payBoxWidth - 10, py, { align: 'right' });
        py += 11.5;
      }
    }

    financialBoxBottom = summaryBoxTopY + calculatedBoxHeight;
  }

  // ----------------------------------------------------
  // Terms, Notes, and Signature (Always below everything!)
  // ----------------------------------------------------
  const hasOrderNotes = Boolean(order.notes && order.notes.trim());
  const termsRequiredHeight = hasOrderNotes ? 100 : 75;
  const minRequiredY = isPackingSlip ? y + 14 : Math.max(y, financialBoxBottom + 12);
  let termsY = minRequiredY;
  if (termsY + termsRequiredHeight > pageHeight - 30) {
    doc.addPage();
    currentPage++;
    drawPageHeader(currentPage);
    termsY = 88;
  }

  // Horizontal clean divider
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.75);
  doc.line(leftMargin, termsY, rightMargin, termsY);
  termsY += 12;

  const termsWidth = 330;

  // Optional Customer/Staff Order Notes
  if (hasOrderNotes) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text('ORDER NOTES / INSTRUCTIONS:', leftMargin, termsY);
    termsY += 9;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105); // slate-600
    const noteLines: string[] = doc.splitTextToSize(order.notes.trim(), termsWidth);
    doc.text(noteLines, leftMargin, termsY);
    termsY += noteLines.length * 7.5 + 4;
  }

  // Left terms / warranty block
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text('TERMS & CONDITIONS / WARRANTY:', leftMargin, termsY);
  termsY += 9;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139); // slate-500
  const termsText =
    'By accepting this invoice, the customer acknowledges and agrees that all items are sold as-is, have been tested for operation prior to release, and have been received in satisfactory condition. Items with a Blue Tag include a 30-day store warranty, and the store reserves the right to provide a refund. Items with a Red Tag are sold as-is with no warranty. Items with a Green Tag are open-box items covered by the manufacturer’s warranty for one (1) year, subject to the manufacturer’s terms and conditions.';
  const termsLines: string[] = doc.splitTextToSize(termsText, termsWidth);
  doc.text(termsLines, leftMargin, termsY);

  // Right signature line
  const sigBoxW = 180;
  const sigX = rightMargin - sigBoxW;
  const sigLineY = termsY + Math.max(18, termsLines.length * 7.5 - 10);

  doc.setDrawColor(148, 163, 184); // slate-400
  doc.setLineWidth(0.75);
  doc.line(sigX, sigLineY, rightMargin, sigLineY);

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Customer Acceptance Signature & Date', sigX + sigBoxW / 2, sigLineY + 8, { align: 'center' });

  // Document Footer
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  const bottomFooterY = pageHeight - 16;
  doc.text(`Casa Central Store POS  |  ${order.order_number}  |  Official Transaction Record`, leftMargin, bottomFooterY);
  doc.text('Generated electronically', rightMargin, bottomFooterY, { align: 'right' });

  // Save the generated PDF
  doc.save(`${order.order_number}_${type.replace(/\s+/g, '_')}.pdf`);
}
