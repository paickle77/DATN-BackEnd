var dataRes = {msg: 'OK'};
const {ProductModel} = require('../models/ProductModel');


//Lấy toàn bộ danh sách
exports.getList = async (req, res) => {
    try {
        const products = await ProductModel.find();
        dataRes.data = products;
        res.json(dataRes);
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
}

//tìm theo ID
 exports.GetOne  = async (req, res, next)=>{
  
    let id = req.params.id ;
    dataRes ={msg: 'OK'};
    try {
      
        let item = await ProductModel.findById(id);
        dataRes.data = item;
 
 
    } catch (error) {
  dataRes.data = null;
        dataRes.msg = error.message;
    }
    res.json(dataRes);
 
 
 }
 
//thêm sản phẩm
 exports.Add = async (req, res, next) => {
    dataRes = { msg: 'OK' };
    try {
        // Lấy dữ liệu từ form gửi lên (lấy thêm các trường description, catId, image)
        let { ProductID,ProductName, Price, Description, Image, Rating,Stock,CategoryID } = req.body;
        
        // Kiểm tra hợp lệ (ví dụ: tên phải >= 3 ký tự và catId không được rỗng)
        if (!ProductName || ProductName.length < 3) {
            dataRes.msg = 'Tên SP cần nhập ít nhất 3 ký tự';
            return res.json(dataRes);
        }
        if (!CategoryID) {
            dataRes.msg = 'catId là bắt buộc';
            return res.json(dataRes);
        }
        
        // Tạo đối tượng sản phẩm để ghi vào CSDL
        let objSP = new ProductModel();
        objSP.ProductID = ProductID;
        objSP.ProductName = ProductName;
        objSP.Price = Price;
        objSP.Description = Description;
        objSP.Image = Image;      // Gán catId từ request
        objSP.Rating = Rating;
        objSP.Stock = Stock;
        objSP.CategoryID = CategoryID;
        // Ghi vào CSDL:
        let kq = await objSP.save();
        return res.json(kq);
    } catch (error) {
        dataRes.data = null;
        dataRes.msg = error.message;
    }
    res.json(dataRes);
};


//Sửa 
 exports.Edit = async (req, res, next) => {
    let id = req.params.id; 
    dataRes = { msg: 'OK' }; 
    try {
        // 1. Lấy dữ liệu từ form gửi lên
      let { ProductID,ProductName, Price, Description, Image, Rating,Stock,CategoryID } = req.body;
        // 2. Kiểm tra hợp lệ (tương tự như hàm Add)
        if (ProductName && ProductName.length < 3) {
            dataRes.msg = 'Tên SP cần nhập ít nhất 3 ký tự';
            return res.json(dataRes);
        }
        let updatedItem = await ProductModel.findByIdAndUpdate(id, { ProductID,ProductName, Price, Description, Image, Rating,Stock,CategoryID }, { new: true });
        if (!updatedItem) {
            dataRes.msg = 'Không tìm thấy sản phẩm với id: ' + id;
            return res.json(dataRes);
        }
        dataRes.data = updatedItem;
        dataRes.msg = 'Cập nhật thành công';
    } catch (error) {
        dataRes.data = null;
        dataRes.msg = error.message;
    }
    res.json(dataRes);
};

//xóa

exports.Delete = async (req, res, next) => {
    let id = req.params.id; 
    dataRes = { msg: 'OK' }; 
    try {
        // Xóa sản phẩm theo id
        let deletedItem = await ProductModel.findByIdAndDelete(id);
        if (!deletedItem) {
            dataRes.msg = 'Không tìm thấy sản phẩm với id: ' + id;
        } else {
            dataRes.msg = 'Xóa thành công sản phẩm với id: ' + id;
        }
    } catch (error) {
        dataRes.data = null;
        dataRes.msg = error.message;
    }
    res.json(dataRes);
};