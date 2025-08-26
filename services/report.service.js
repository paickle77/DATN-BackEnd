// services/report.service.js

const ExcelJS = require('exceljs');
const Bill = require('../models/bill.model');
const BillDetail = require('../models/BillDetail.model');

/**
 * Sinh ra Excel báo cáo doanh thu theo khoảng fromDate–toDate,
 * trả về Buffer để người gọi có thể gửi email hoặc trả về HTTP download.
 *
 * @param {Date} fromDate 
 * @param {Date} toDate 
 * @returns {Promise<Buffer>}
 */
async function generateReportBuffer(fromDate, toDate) {
  // 1. Lấy đơn hàng trong khoảng
  const bills = await Bill.find({
    created_at: { $gte: fromDate, $lte: toDate }
  }).lean();

  // 2. Lấy chi tiết
  const billIds = bills.map(b => b._id);
  const details = await BillDetail.find({
    bill_id: { $in: billIds }
  }).lean();

  // 3. Tính tổng
  const totalBills      = bills.length;
  const totalCustomers  = new Set(bills.map(b => b.user_id)).size;
  const totalRevenue    = details.reduce((sum, d) => sum + d.price * d.quantity, 0);

  // 4. Tạo workbook
  const wb = new ExcelJS.Workbook();
  const summary = wb.addWorksheet('Tổng quan');
  const detail  = wb.addWorksheet('Chi tiết đơn');

  // --- Sheet Tổng quan
  summary.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value',  key: 'value',  width: 20 },
  ];
  summary.addRows([
    { metric: 'Tổng doanh thu (₫)', value: totalRevenue },
    { metric: 'Tổng đơn hàng',       value: totalBills },
    { metric: 'Tổng khách hàng',     value: totalCustomers },
  ]);
  summary.getColumn('value').numFmt = '#,##0';

  // --- Sheet Chi tiết
  detail.columns = [
    { header: '#',         key: 'idx',    width: 5  },
    { header: 'Bill ID',   key: 'billId', width: 30 },
    { header: 'Quantity',  key: 'qty',    width: 12 },
    { header: 'Unit Price',key: 'price',  width: 15 },
    { header: 'Total (₫)', key: 'total',  width: 15 },
  ];
  details.forEach((d, i) => {
    detail.addRow({
      idx:    i + 1,
      billId: d.bill_id.toString(),
      qty:    d.quantity,
      price:  d.price,
      total:  d.price * d.quantity
    });
  });
  detail.getColumn('price').numFmt = '#,##0';
  detail.getColumn('total').numFmt = '#,##0';

  // 5. Xuất buffer
  return wb.xlsx.writeBuffer();
}

module.exports = {
  generateReportBuffer
};