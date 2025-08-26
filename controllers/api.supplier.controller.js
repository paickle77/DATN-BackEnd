const Base = require('./base.controller');
const Supplier = require('../models/supplier.model');

// Lấy base methods từ Base controller
const baseController = Base(Supplier);

// Tạo supplier controller với base methods và custom methods
const supplierController = {
  // Spread tất cả base methods (getList, GetOne, Add, Edit, Delete)
  ...baseController,
  
  // Override Add method để validate dữ liệu
  Add: async (req, res) => {
    try {
      // Validate phone number format
      const phoneRegex = /^[0-9+\-\s()]+$/;
      if (req.body.phone && !phoneRegex.test(req.body.phone)) {
        return res.status(400).json({ 
          msg: 'Số điện thoại không hợp lệ', 
          data: null 
        });
      }

//------------------update Fix web admin---------------------
      // Validate rating (1-5)
      if (req.body.rating) {
        const rating = Number(req.body.rating);
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
          return res.status(400).json({ 
            msg: 'Đánh giá phải là số nguyên từ 1 đến 5', 
            data: null 
          });
        }
      }
//-----------------Kết thúc Fix web admin---------------------

      // Validate contract dates
      if (req.body.contract_start_date && req.body.contract_end_date) {
        const startDate = new Date(req.body.contract_start_date);
        const endDate = new Date(req.body.contract_end_date);
        
        if (startDate >= endDate) {
          return res.status(400).json({ 
            msg: 'Ngày kết thúc hợp đồng phải sau ngày bắt đầu', 
            data: null 
          });
        }
      }

      const obj = new Supplier(req.body);
      const saved = await obj.save();
      res.json({ msg: 'OK', data: saved });
    } catch (err) {
      res.status(400).json({ msg: err.message, data: null });
    }
  },

  // Override Edit method để validate dữ liệu
  Edit: async (req, res) => {
    try {
      // Validate phone number format
      const phoneRegex = /^[0-9+\-\s()]+$/;
      if (req.body.phone && !phoneRegex.test(req.body.phone)) {
        return res.status(400).json({ 
          msg: 'Số điện thoại không hợp lệ', 
          data: null 
        });
      }

//------------------update Fix web admin---------------------
      // Validate rating (1-5)
      if (req.body.rating) {
        const rating = Number(req.body.rating);
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
          return res.status(400).json({ 
            msg: 'Đánh giá phải là số nguyên từ 1 đến 5', 
            data: null 
          });
        }
      }
//-----------------Kết thúc Fix web admin---------------------

      // Validate contract dates
      if (req.body.contract_start_date && req.body.contract_end_date) {
        const startDate = new Date(req.body.contract_start_date);
        const endDate = new Date(req.body.contract_end_date);
        
        if (startDate >= endDate) {
          return res.status(400).json({ 
            msg: 'Ngày kết thúc hợp đồng phải sau ngày bắt đầu', 
            data: null 
          });
        }
      }

      const updated = await Supplier.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
      
      if (!updated) {
        return res.status(404).json({ 
          msg: 'Không tìm thấy nhà phân phối', 
          data: null 
        });
      }
      
      res.json({ msg: 'OK', data: updated });
    } catch (err) {
      res.status(400).json({ msg: err.message, data: null });
    }
  },

  // Method để lấy danh sách nhà phân phối đang hoạt động
  getActiveSuppliers: async (req, res) => {
    try {
      const suppliers = await Supplier.findActive().sort({ name: 1 });
      res.json({ msg: 'OK', data: suppliers });
    } catch (err) {
      res.status(500).json({ msg: err.message });
    }
  },

  // Method để tìm kiếm nhà phân phối theo tên
  searchByName: async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) {
        return res.status(400).json({ 
          msg: 'Vui lòng nhập từ khóa tìm kiếm', 
          data: null 
        });
      }

      const regex = new RegExp(q, 'i');
      const suppliers = await Supplier.find({
        $or: [
          { name: regex },
          { contact_person: regex }
        ]
      }).sort({ name: 1 });

      res.json({ msg: 'OK', data: suppliers });
    } catch (err) {
      res.status(500).json({ msg: err.message });
    }
  },

  // Method để lấy thống kê nhà phân phối
  getStatistics: async (req, res) => {
    try {
      const totalSuppliers = await Supplier.countDocuments();
      const activeSuppliers = await Supplier.countDocuments({ status: 'active' });
      const inactiveSuppliers = await Supplier.countDocuments({ status: 'inactive' });
      
      // Thống kê theo rating
      const ratingStats = await Supplier.aggregate([
        {
          $group: {
            _id: '$rating',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      // Hợp đồng sắp hết hạn (trong 30 ngày tới)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      const expiringSoon = await Supplier.countDocuments({
        contract_end_date: {
          $gte: new Date(),
          $lte: thirtyDaysFromNow
        },
        status: 'active'
      });

      res.json({
        msg: 'OK',
        data: {
          totalSuppliers,
          activeSuppliers,
          inactiveSuppliers,
          ratingStats,
          expiringSoon
        }
      });
    } catch (err) {
      res.status(500).json({ msg: err.message });
    }
  },

  // Method để lấy nhà phân phối có hợp đồng sắp hết hạn
  getExpiringSoon: async (req, res) => {
    try {
      const days = parseInt(req.query.days) || 30;
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      
      const suppliers = await Supplier.find({
        contract_end_date: {
          $gte: new Date(),
          $lte: targetDate
        },
        status: 'active'
      }).sort({ contract_end_date: 1 });

      res.json({ msg: 'OK', data: suppliers });
    } catch (err) {
      res.status(500).json({ msg: err.message });
    }
  }
};

module.exports = supplierController;