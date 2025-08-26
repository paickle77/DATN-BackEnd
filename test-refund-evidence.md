// Checklist các log cần có để chứng minh hoàn tiền tự động

// ❌ LOG HIỆN TẠI (CHỈ CHUYỂN TRẠNG THÁI):
⚠️ Missing VNPay transaction number - cannot process VNPay refund
🔧 Auto-approving manual refund for RefundManagement due to missing transaction_no

// ✅ LOG CẦN CÓ (HOÀN TIỀN TỰ ĐỘNG THẬT):
💳 Processing VNPay refund for refund_pending order...
📤 Sending refund request to VNPay API...
🔧 Refund params: {
  vnp_TxnRef: 'bill_id',
  vnp_Amount: 18000000,
  vnp_TransactionNo: 'REAL_VNPAY_TRANSACTION_NUMBER', // ✅ Có transaction number thật
  vnp_TransactionDate: '20250826101312'
}
📥 VNPay API Response: {
  vnp_ResponseCode: "00",           // ✅ Thành công
  vnp_TransactionNo: "REF_123456",  // ✅ Mã hoàn tiền từ VNPay
  vnp_Message: "Success"
}
✅ VNPay refund processed successfully
✅ Bill updated with refund_method: 'vnpay_api' // ✅ Không phải 'manual_fallback'
