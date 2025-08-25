const mongoose = require('./db');

const SupplierSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  contact_person: { 
    type: String, 
    required: true,
    trim: true
  },
  phone: { 
    type: String, 
    required: true,
    trim: true
  },
  email: { 
    type: String,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return !v || /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
      },
      message: 'Email không hợp lệ'
    }
  },
  address: { 
    type: String, 
    required: true,
    trim: true
  },
  tax_code: { 
    type: String,
    trim: true
  },
  payment_terms: { 
    type: String,
    trim: true,
    default: 'Thanh toán trong 30 ngày'
  },
  status: { 
    type: String, 
    enum: ['active', 'inactive'], 
    default: 'active' 
  },
  rating: { 
    type: Number, 
    min: 1, 
    max: 5, 
    default: 5 
  },
  contract_start_date: { 
    type: Date 
  },
  contract_end_date: { 
    type: Date 
  },
  notes: { 
    type: String,
    trim: true
  }
}, {
  collection: 'suppliers',
  timestamps: { 
    createdAt: 'created_at',
    updatedAt: 'updated_at' 
  }
});

// Index để tìm kiếm nhanh
SupplierSchema.index({ name: 1 });
SupplierSchema.index({ status: 1 });
SupplierSchema.index({ contact_person: 1 });

// Virtual để kiểm tra hợp đồng còn hiệu lực
SupplierSchema.virtual('isContractActive').get(function() {
  if (!this.contract_end_date) return true;
  return new Date() <= this.contract_end_date;
});

// Method để lấy thông tin tóm tắt
SupplierSchema.methods.getSummary = function() {
  return {
    _id: this._id,
    name: this.name,
    contact_person: this.contact_person,
    phone: this.phone,
    status: this.status,
    rating: this.rating
  };
};

// Static method để tìm nhà phân phối active
SupplierSchema.statics.findActive = function() {
  return this.find({ status: 'active' });
};

module.exports = mongoose.model('Supplier', SupplierSchema);