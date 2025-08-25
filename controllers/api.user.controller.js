const User = require('../models/user.model');
const Account = require('../models/account.model');
const Address = require('../models/address.model');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const { sendOTPEmail } = require('../utils/sendMail');

// Tạo controller từ base
const Base = require('./base.controller');
const userController = Base(User);

// ✅ THÊM: API CHỈ CHO WEB ADMIN - Lấy danh sách khách hàng kèm thông tin đầy đủ
userController.getCustomersWithDetails = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', role = 'user' } = req.query;
    
    console.log('🔍 [WEB ADMIN] Lấy danh sách khách hàng với params:', { page, limit, search });
    
    const pipeline = [
      // 1. Match users (có thể filter theo role nếu cần)
      { $match: {} },
      
      // 2. Join với collection accounts
      {
        $lookup: {
          from: 'accounts',
          localField: 'account_id',
          foreignField: '_id',
          as: 'account_info'
        }
      },
      {
        $unwind: {
          path: '$account_info',
          preserveNullAndEmptyArrays: true
        }
      },
      
      // 3. ✅ SỬA: Join đúng với collection addresses (Address có user_id tham chiếu User)
      {
        $lookup: {
          from: 'addresses',
          localField: '_id',          // User._id
          foreignField: 'user_id',    // Address.user_id
          as: 'address_info'
        }
      },
      {
        $unwind: {
          path: '$address_info',
          preserveNullAndEmptyArrays: true
        }
      },
      
      // 4. Join với collection bills để tính số đơn hàng và ngày đơn cuối
      {
        $lookup: {
          from: 'bills',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$user_id', '$$userId'] },
                status: { $ne: 'cancelled' }
              }
            },
            // Sắp xếp để lấy đơn hàng mới nhất
            { $sort: { created_at: -1 } }
          ],
          as: 'bills'
        }
      },
      
      // 5. Filter theo search term (nếu có)
      ...(search ? [{
        $match: {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
            { 'account_info.email': { $regex: search, $options: 'i' } }
          ]
        }
      }] : []),
      
      // 6. Add computed fields
      {
        $addFields: {
          // Thông tin từ account
          email: '$account_info.email',
          is_lock: { $ifNull: ['$account_info.is_lock', false] },
          provider: { $ifNull: ['$account_info.provider', 'local'] },
          account_role: { $ifNull: ['$account_info.role', 'user'] },
          
          // ✅ SỬA: Thông tin địa chỉ đầy đủ với join đúng
          address_detail: {
            $cond: {
              if: { $ne: ['$address_info', null] },
              then: {
                street: { $ifNull: ['$address_info.detail_address', ''] },
                ward: { $ifNull: ['$address_info.ward', ''] },
                district: { $ifNull: ['$address_info.district', ''] },
                city: { $ifNull: ['$address_info.city', ''] },
                full_address: {
                  $trim: {
                    input: {
                      $concat: [
                        { $ifNull: ['$address_info.detail_address', ''] },
                        {
                          $cond: {
                            if: { $and: [{ $ne: ['$address_info.ward', null] }, { $ne: ['$address_info.ward', ''] }] },
                            then: { $concat: [', ', { $ifNull: ['$address_info.ward', ''] }] },
                            else: ''
                          }
                        },
                        {
                          $cond: {
                            if: { $and: [{ $ne: ['$address_info.district', null] }, { $ne: ['$address_info.district', ''] }] },
                            then: { $concat: [', ', { $ifNull: ['$address_info.district', ''] }] },
                            else: ''
                          }
                        },
                        {
                          $cond: {
                            if: { $and: [{ $ne: ['$address_info.city', null] }, { $ne: ['$address_info.city', ''] }] },
                            then: { $concat: [', ', { $ifNull: ['$address_info.city', ''] }] },
                            else: ''
                          }
                        }
                      ]
                    },
                    chars: ', '
                  }
                }
              },
              else: null
            }
          },
          
          // Avatar với fallback (GIỮ NGUYÊN để mobile app hoạt động)
          display_avatar: {
            $cond: {
              if: { $and: [{ $ne: ['$avatar', null] }, { $ne: ['$avatar', ''] }] },
              then: '$avatar',
              else: { 
                $cond: {
                  if: { $and: [{ $ne: ['$image', null] }, { $ne: ['$image', ''] }] },
                  then: '$image',
                  else: 'avatarmacdinh.png'
                }
              }
            }
          },
          
          // Thống kê đơn hàng
          total_orders: { $size: '$bills' },
          total_spent: {
            $sum: {
              $map: {
                input: '$bills',
                as: 'bill', 
                in: { $ifNull: ['$$bill.total', 0] }
              }
            }
          },
          
          // ✅ THÊM: Ngày đơn hàng cuối cùng
          last_order_date: {
            $cond: {
              if: { $gt: [{ $size: '$bills' }, 0] },
              then: { 
                $arrayElemAt: [
                  { $map: { input: '$bills', as: 'bill', in: '$$bill.created_at' } }, 
                  0 
                ]
              },
              else: null
            }
          }
        }
      },
      
      // 7. Remove unnecessary fields để giảm kích thước response
      {
        $project: {
          account_info: 0,
          address_info: 0,
          bills: 0,
          password: 0,
          otp: 0,
          otpExpires: 0
          // ✅ GIỮ NGUYÊN: Không bỏ gender và birth_date để mobile app vẫn hoạt động nếu cần
        }
      },
      
      // 8. Sort by creation date
      { $sort: { created_at: -1 } }
    ];

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [customers, totalCount] = await Promise.all([
      User.aggregate([...pipeline, { $skip: skip }, { $limit: parseInt(limit) }]),
      User.aggregate([...pipeline, { $count: 'total' }])
    ]);

    const total = totalCount[0]?.total || 0;
    const totalPages = Math.ceil(total / parseInt(limit));

    console.log(`✅ [WEB ADMIN] Lấy ${customers.length}/${total} khách hàng với thông tin đầy đủ`);
    console.log('📋 Sample customer data:', customers[0] ? {
      id: customers[0]._id,
      name: customers[0].name,
      email: customers[0].email,
      address: customers[0].address_detail?.full_address || 'Chưa có địa chỉ'
    } : 'Không có dữ liệu');

    res.json({
      success: true,
      message: 'Lấy danh sách khách hàng thành công',
      data: {
        customers,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: total,
          itemsPerPage: parseInt(limit),
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (err) {
    console.error('❌ Lỗi khi lấy danh sách khách hàng:', err);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách khách hàng',
      error: err.message
    });
  }
};

// ✅ THÊM: API CHỈ CHO WEB ADMIN - Thống kê khách hàng chi tiết
userController.getCustomerStats = async (req, res) => {
  try {
    console.log('📊 [WEB ADMIN] Lấy thống kê khách hàng');

    const pipeline = [
      {
        $lookup: {
          from: 'accounts',
          localField: 'account_id',
          foreignField: '_id',
          as: 'account_info'
        }
      },
      {
        $unwind: {
          path: '$account_info',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'bills',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$user_id', '$$userId'] },
                status: { $ne: 'cancelled' }
              }
            }
          ],
          as: 'bills'
        }
      },
      // ✅ SỬA: Join với addresses để đếm user có địa chỉ
      {
        $lookup: {
          from: 'addresses',
          localField: '_id',
          foreignField: 'user_id',
          as: 'addresses'
        }
      },
      {
        $group: {
          _id: null,
          totalCustomers: { $sum: 1 },
          
          // Thống kê theo trạng thái account
          activeCustomers: {
            $sum: { $cond: [{ $ne: [{ $ifNull: ['$account_info.is_lock', false] }, true] }, 1, 0] }
          },
          lockedCustomers: {
            $sum: { $cond: [{ $eq: [{ $ifNull: ['$account_info.is_lock', false] }, true] }, 1, 0] }
          },
          
          // Thống kê theo provider
          localAccounts: {
            $sum: { $cond: [{ $eq: [{ $ifNull: ['$account_info.provider', 'local'] }, 'local'] }, 1, 0] }
          },
          googleAccounts: {
            $sum: { $cond: [{ $eq: [{ $ifNull: ['$account_info.provider', 'local'] }, 'google'] }, 1, 0] }
          },
          facebookAccounts: {
            $sum: { $cond: [{ $eq: [{ $ifNull: ['$account_info.provider', 'local'] }, 'facebook'] }, 1, 0] }
          },
          
          // ✅ GIỮ NGUYÊN: Thống kê theo giới tính (để mobile app không bị lỗi nếu có dùng)
          maleCustomers: {
            $sum: { $cond: [{ $eq: ['$gender', 'male'] }, 1, 0] }
          },
          femaleCustomers: {
            $sum: { $cond: [{ $eq: ['$gender', 'female'] }, 1, 0] }
          },
          unknownGender: {
            $sum: { $cond: [{ $in: ['$gender', [null, 'other']] }, 1, 0] }
          },
          
          // Thống kê về đơn hàng
          customersWithOrders: {
            $sum: { $cond: [{ $gt: [{ $size: '$bills' }, 0] }, 1, 0] }
          },
          totalRevenue: {
            $sum: {
              $sum: {
                $map: {
                  input: '$bills',
                  as: 'bill',
                  in: { $ifNull: ['$$bill.total', 0] }
                }
              }
            }
          },
          totalOrders: {
            $sum: { $size: '$bills' }
          },
          
          // ✅ SỬA: Thống kê địa chỉ với join đúng
          customersWithAddress: {
            $sum: { $cond: [{ $gt: [{ $size: '$addresses' }, 0] }, 1, 0] }
          },
          verifiedCustomers: {
            $sum: { $cond: [{ $eq: [{ $ifNull: ['$is_verified', false] }, true] }, 1, 0] }
          }
        }
      }
    ];

    const stats = await User.aggregate(pipeline);
    const result = stats[0] || {
      totalCustomers: 0,
      activeCustomers: 0,
      lockedCustomers: 0,
      localAccounts: 0,
      googleAccounts: 0,
      facebookAccounts: 0,
      maleCustomers: 0,
      femaleCustomers: 0,
      unknownGender: 0,
      customersWithOrders: 0,
      totalRevenue: 0,
      totalOrders: 0,
      customersWithAddress: 0,
      verifiedCustomers: 0
    };

    console.log('✅ [WEB ADMIN] Thống kê khách hàng:', result);

    res.json({
      success: true,
      message: 'Lấy thống kê khách hàng thành công',
      data: result
    });

  } catch (err) {
    console.error('❌ Lỗi khi lấy thống kê khách hàng:', err);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy thống kê',
      error: err.message
    });
  }
};

// ✅ THÊM: API CHỈ CHO WEB ADMIN - Khóa/mở khóa tài khoản
userController.toggleCustomerLock = async (req, res) => {
  try {
    const { userId } = req.params;
    const { is_lock, reason = '' } = req.body;

    console.log(`🔒 ${is_lock ? 'Khóa' : 'Mở khóa'} tài khoản user:`, userId);

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'ID user không hợp lệ'
      });
    }

    // Tìm user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khách hàng'
      });
    }

    // Cập nhật trạng thái khóa ở Account
    const account = await Account.findByIdAndUpdate(
      user.account_id,
      { 
        is_lock,
        lock_reason: is_lock ? reason : null,
        lock_date: is_lock ? new Date() : null,
        unlock_date: !is_lock ? new Date() : null
      },
      { new: true }
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản liên kết'
      });
    }

    console.log(`✅ ${is_lock ? 'Khóa' : 'Mở khóa'} thành công tài khoản:`, account.email);

    res.json({
      success: true,
      message: `${is_lock ? 'Khóa' : 'Mở khóa'} tài khoản thành công`,
      data: {
        user_id: userId,
        account_id: account._id,
        email: account.email,
        is_lock: account.is_lock,
        reason,
        action_date: new Date()
      }
    });

  } catch (err) {
    console.error('❌ Lỗi cập nhật trạng thái khóa:', err);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật trạng thái',
      error: err.message
    });
  }
};

// ✅ GIỮ NGUYÊN TẤT CẢ CÁC HÀM KHÁC ĐỂ MOBILE APP KHÔNG BỊ ẢNH HƯỞNG

// ✅ SỬA: Tạo hồ sơ user profile (GIỮ NGUYÊN)
userController.createUserProfile = async (req, res) => {
  try {
    const { account_id, name, phone, gender, avatar } = req.body;

    console.log('📝 Tạo profile với data:', { account_id, name, phone, gender, avatar });

    if (!account_id || !name || !phone) {
      return res.status(400).json({ 
        success: false, 
        message: 'Thiếu thông tin cá nhân (account_id, name, phone)' 
      });
    }

    // Validate account_id
    if (!mongoose.Types.ObjectId.isValid(account_id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'account_id không hợp lệ' 
      });
    }

    // ✅ Kiểm tra user đã tồn tại chưa
    const exists = await User.findOne({ account_id });
    if (exists) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tài khoản này đã có hồ sơ người dùng' 
      });
    }

    // ✅ Tạo user mới
    const user = new User({
      account_id: new mongoose.Types.ObjectId(account_id),
      name,
      phone,
      gender,
      avatar: avatar || 'avatarmacdinh.png'
    });

    await user.save();

    console.log('✅ Tạo user profile thành công:', user._id);

    res.status(201).json({
      success: true,
      message: 'Đã tạo hồ sơ người dùng thành công',
      data: {
        _id: user._id.toString(),
        account_id: user.account_id.toString(),
        name: user.name,
        phone: user.phone,
        gender: user.gender,
        avatar: user.avatar
      }
    });
  } catch (err) {
    console.error('❌ Lỗi tạo user profile:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

// ✅ SỬA: Lấy thông tin user theo account_id (GIỮ NGUYÊN)
userController.getByAccountId = async (req, res) => {
  try {
    const { account_id } = req.params;
    console.log('🔍 Tìm user với account_id:', account_id);

    // Validate account_id
    if (!mongoose.Types.ObjectId.isValid(account_id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'account_id không hợp lệ' 
      });
    }

    const user = await User.findOne({ account_id });
    if (!user) {
      console.log('❌ Không tìm thấy user với account_id:', account_id);
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy user' 
      });
    }

    console.log('✅ Tìm thấy user:', user._id);
    return res.json({ 
      success: true, 
      data: user 
    });
  } catch (err) {
    console.error('❌ Lỗi khi tìm user theo account_id:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server' 
    });
  }
};

// ✅ Override method Add để hỗ trợ Google và Facebook login (GIỮ NGUYÊN)
userController.Add = async (req, res) => {
  try {
    const { name, email, password, image, google_id, facebook_id } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Thiếu email.' });
    }

    // Kiểm tra user đã tồn tại chưa
    let user = await User.findOne({ email });
    if (user) {
      return res.status(200).json({
        success: true,
        message: 'Tài khoản đã tồn tại',
        data: user
      });
    }

    const newUser = new User({
      name,
      email,
      image: image || null,
      provider: 'local',
    });

    // Google login
    if (google_id) {
      newUser.google_id = google_id;
      newUser.provider = 'google';
      newUser.password = null;
    }
    // Facebook login
    else if (facebook_id) {
      newUser.facebook_id = facebook_id;
      newUser.provider = 'facebook';
      newUser.password = null;
    }
    // Local registration
    else {
      if (!password) {
        return res.status(400).json({ success: false, message: 'Thiếu mật khẩu.' });
      }

      const hash = await bcrypt.hash(password, 10);
      newUser.password = hash;
      newUser.provider = 'local';
    }

    await newUser.save();

    return res.status(201).json({
      success: true,
      message: 'Tạo tài khoản thành công',
      data: {
        _id: newUser._id,
        email: newUser.email,
        name: newUser.name,
        image: newUser.image,
        provider: newUser.provider,
        google_id: newUser.google_id,
        facebook_id: newUser.facebook_id,
      }
    });

  } catch (err) {
    console.error('Lỗi khi thêm user:', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// ✅ THÊM: API CHỈ CHO WEB ADMIN - Lấy danh sách khách hàng kèm thông tin đầy đủ
userController.getCustomersWithDetails = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', role = 'user' } = req.query;
    
    console.log('🔍 [WEB ADMIN] Lấy danh sách khách hàng với params:', { page, limit, search });
    
    const pipeline = [
      // 1. Match users (có thể filter theo role nếu cần)
      { $match: {} },
      
      // 2. Join với collection accounts
      {
        $lookup: {
          from: 'accounts',
          localField: 'account_id',
          foreignField: '_id',
          as: 'account_info'
        }
      },
      {
        $unwind: {
          path: '$account_info',
          preserveNullAndEmptyArrays: true
        }
      },
      
      // 3. ✅ SỬA: Join đúng với collection addresses (Address có user_id tham chiếu User)
      {
        $lookup: {
          from: 'addresses',
          localField: '_id',          // User._id
          foreignField: 'user_id',    // Address.user_id
          as: 'address_info'
        }
      },
      {
        $unwind: {
          path: '$address_info',
          preserveNullAndEmptyArrays: true
        }
      },
      
      // 4. Join với collection bills để tính số đơn hàng và ngày đơn cuối
      {
        $lookup: {
          from: 'bills',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$user_id', '$$userId'] },
                status: { $ne: 'cancelled' }
              }
            },
            // Sắp xếp để lấy đơn hàng mới nhất
            { $sort: { created_at: -1 } }
          ],
          as: 'bills'
        }
      },
      
      // 5. Filter theo search term (nếu có)
      ...(search ? [{
        $match: {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
            { 'account_info.email': { $regex: search, $options: 'i' } }
          ]
        }
      }] : []),
      
      // 6. Add computed fields
      {
        $addFields: {
          // Thông tin từ account
          email: '$account_info.email',
          is_lock: { $ifNull: ['$account_info.is_lock', false] },
          provider: { $ifNull: ['$account_info.provider', 'local'] },
          account_role: { $ifNull: ['$account_info.role', 'user'] },
          
          // ✅ SỬA: Thông tin địa chỉ đầy đủ với join đúng
          address_detail: {
            $cond: {
              if: { $ne: ['$address_info', null] },
              then: {
                street: { $ifNull: ['$address_info.detail_address', ''] },
                ward: { $ifNull: ['$address_info.ward', ''] },
                district: { $ifNull: ['$address_info.district', ''] },
                city: { $ifNull: ['$address_info.city', ''] },
                full_address: {
                  $trim: {
                    input: {
                      $concat: [
                        { $ifNull: ['$address_info.detail_address', ''] },
                        {
                          $cond: {
                            if: { $and: [{ $ne: ['$address_info.ward', null] }, { $ne: ['$address_info.ward', ''] }] },
                            then: { $concat: [', ', { $ifNull: ['$address_info.ward', ''] }] },
                            else: ''
                          }
                        },
                        {
                          $cond: {
                            if: { $and: [{ $ne: ['$address_info.district', null] }, { $ne: ['$address_info.district', ''] }] },
                            then: { $concat: [', ', { $ifNull: ['$address_info.district', ''] }] },
                            else: ''
                          }
                        },
                        {
                          $cond: {
                            if: { $and: [{ $ne: ['$address_info.city', null] }, { $ne: ['$address_info.city', ''] }] },
                            then: { $concat: [', ', { $ifNull: ['$address_info.city', ''] }] },
                            else: ''
                          }
                        }
                      ]
                    },
                    chars: ', '
                  }
                }
              },
              else: null
            }
          },
          
          // Avatar với fallback (GIỮ NGUYÊN để mobile app hoạt động)
          display_avatar: {
            $cond: {
              if: { $and: [{ $ne: ['$avatar', null] }, { $ne: ['$avatar', ''] }] },
              then: '$avatar',
              else: { 
                $cond: {
                  if: { $and: [{ $ne: ['$image', null] }, { $ne: ['$image', ''] }] },
                  then: '$image',
                  else: 'avatarmacdinh.png'
                }
              }
            }
          },
          
          // Thống kê đơn hàng
          total_orders: { $size: '$bills' },
          total_spent: {
            $sum: {
              $map: {
                input: '$bills',
                as: 'bill', 
                in: { $ifNull: ['$$bill.total', 0] }
              }
            }
          },
          
          // ✅ THÊM: Ngày đơn hàng cuối cùng
          last_order_date: {
            $cond: {
              if: { $gt: [{ $size: '$bills' }, 0] },
              then: { 
                $arrayElemAt: [
                  { $map: { input: '$bills', as: 'bill', in: '$$bill.created_at' } }, 
                  0 
                ]
              },
              else: null
            }
          }
        }
      },
      
      // 7. Remove unnecessary fields để giảm kích thước response
      {
        $project: {
          account_info: 0,
          address_info: 0,
          bills: 0,
          password: 0,
          otp: 0,
          otpExpires: 0
          // ✅ GIỮ NGUYÊN: Không bỏ gender và birth_date để mobile app vẫn hoạt động nếu cần
        }
      },
      
      // 8. Sort by creation date
      { $sort: { created_at: -1 } }
    ];

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [customers, totalCount] = await Promise.all([
      User.aggregate([...pipeline, { $skip: skip }, { $limit: parseInt(limit) }]),
      User.aggregate([...pipeline, { $count: 'total' }])
    ]);

    const total = totalCount[0]?.total || 0;
    const totalPages = Math.ceil(total / parseInt(limit));

    console.log(`✅ [WEB ADMIN] Lấy ${customers.length}/${total} khách hàng với thông tin đầy đủ`);
    console.log('📋 Sample customer data:', customers[0] ? {
      id: customers[0]._id,
      name: customers[0].name,
      email: customers[0].email,
      address: customers[0].address_detail?.full_address || 'Chưa có địa chỉ'
    } : 'Không có dữ liệu');

    res.json({
      success: true,
      message: 'Lấy danh sách khách hàng thành công',
      data: {
        customers,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: total,
          itemsPerPage: parseInt(limit),
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (err) {
    console.error('❌ Lỗi khi lấy danh sách khách hàng:', err);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách khách hàng',
      error: err.message
    });
  }
};

// ✅ THÊM: API CHỈ CHO WEB ADMIN - Thống kê khách hàng chi tiết
userController.getCustomerStats = async (req, res) => {
  try {
    console.log('📊 [WEB ADMIN] Lấy thống kê khách hàng');

    const pipeline = [
      {
        $lookup: {
          from: 'accounts',
          localField: 'account_id',
          foreignField: '_id',
          as: 'account_info'
        }
      },
      {
        $unwind: {
          path: '$account_info',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'bills',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$user_id', '$$userId'] },
                status: { $ne: 'cancelled' }
              }
            }
          ],
          as: 'bills'
        }
      },
      // ✅ SỬA: Join với addresses để đếm user có địa chỉ
      {
        $lookup: {
          from: 'addresses',
          localField: '_id',
          foreignField: 'user_id',
          as: 'addresses'
        }
      },
      {
        $group: {
          _id: null,
          totalCustomers: { $sum: 1 },
          
          // Thống kê theo trạng thái account
          activeCustomers: {
            $sum: { $cond: [{ $ne: [{ $ifNull: ['$account_info.is_lock', false] }, true] }, 1, 0] }
          },
          lockedCustomers: {
            $sum: { $cond: [{ $eq: [{ $ifNull: ['$account_info.is_lock', false] }, true] }, 1, 0] }
          },
          
          // Thống kê theo provider
          localAccounts: {
            $sum: { $cond: [{ $eq: [{ $ifNull: ['$account_info.provider', 'local'] }, 'local'] }, 1, 0] }
          },
          googleAccounts: {
            $sum: { $cond: [{ $eq: [{ $ifNull: ['$account_info.provider', 'local'] }, 'google'] }, 1, 0] }
          },
          facebookAccounts: {
            $sum: { $cond: [{ $eq: [{ $ifNull: ['$account_info.provider', 'local'] }, 'facebook'] }, 1, 0] }
          },
          
          // ✅ GIỮ NGUYÊN: Thống kê theo giới tính (để mobile app không bị lỗi nếu có dùng)
          maleCustomers: {
            $sum: { $cond: [{ $eq: ['$gender', 'male'] }, 1, 0] }
          },
          femaleCustomers: {
            $sum: { $cond: [{ $eq: ['$gender', 'female'] }, 1, 0] }
          },
          unknownGender: {
            $sum: { $cond: [{ $in: ['$gender', [null, 'other']] }, 1, 0] }
          },
          
          // Thống kê về đơn hàng
          customersWithOrders: {
            $sum: { $cond: [{ $gt: [{ $size: '$bills' }, 0] }, 1, 0] }
          },
          totalRevenue: {
            $sum: {
              $sum: {
                $map: {
                  input: '$bills',
                  as: 'bill',
                  in: { $ifNull: ['$$bill.total', 0] }
                }
              }
            }
          },
          totalOrders: {
            $sum: { $size: '$bills' }
          },
          
          // ✅ SỬA: Thống kê địa chỉ với join đúng
          customersWithAddress: {
            $sum: { $cond: [{ $gt: [{ $size: '$addresses' }, 0] }, 1, 0] }
          },
          verifiedCustomers: {
            $sum: { $cond: [{ $eq: [{ $ifNull: ['$is_verified', false] }, true] }, 1, 0] }
          }
        }
      }
    ];

    const stats = await User.aggregate(pipeline);
    const result = stats[0] || {
      totalCustomers: 0,
      activeCustomers: 0,
      lockedCustomers: 0,
      localAccounts: 0,
      googleAccounts: 0,
      facebookAccounts: 0,
      maleCustomers: 0,
      femaleCustomers: 0,
      unknownGender: 0,
      customersWithOrders: 0,
      totalRevenue: 0,
      totalOrders: 0,
      customersWithAddress: 0,
      verifiedCustomers: 0
    };

    console.log('✅ [WEB ADMIN] Thống kê khách hàng:', result);

    res.json({
      success: true,
      message: 'Lấy thống kê khách hàng thành công',
      data: result
    });

  } catch (err) {
    console.error('❌ Lỗi khi lấy thống kê khách hàng:', err);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy thống kê',
      error: err.message
    });
  }
};

// ✅ THÊM: API CHỈ CHO WEB ADMIN - Khóa/mở khóa tài khoản
userController.toggleCustomerLock = async (req, res) => {
  try {
    const { userId } = req.params;
    const { is_lock, reason = '' } = req.body;

    console.log(`🔒 ${is_lock ? 'Khóa' : 'Mở khóa'} tài khoản user:`, userId);

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'ID user không hợp lệ'
      });
    }

    // Tìm user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khách hàng'
      });
    }

    // Cập nhật trạng thái khóa ở Account
    const account = await Account.findByIdAndUpdate(
      user.account_id,
      { 
        is_lock,
        lock_reason: is_lock ? reason : null,
        lock_date: is_lock ? new Date() : null,
        unlock_date: !is_lock ? new Date() : null
      },
      { new: true }
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản liên kết'
      });
    }

    console.log(`✅ ${is_lock ? 'Khóa' : 'Mở khóa'} thành công tài khoản:`, account.email);

    res.json({
      success: true,
      message: `${is_lock ? 'Khóa' : 'Mở khóa'} tài khoản thành công`,
      data: {
        user_id: userId,
        account_id: account._id,
        email: account.email,
        is_lock: account.is_lock,
        reason,
        action_date: new Date()
      }
    });

  } catch (err) {
    console.error('❌ Lỗi cập nhật trạng thái khóa:', err);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật trạng thái',
      error: err.message
    });
  }
};

// ✅ GIỮ NGUYÊN TẤT CẢ CÁC HÀM KHÁC ĐỂ MOBILE APP KHÔNG BỊ ẢNH HƯỞNG


module.exports = userController;