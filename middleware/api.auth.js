const jwt = require('jsonwebtoken');
var {userModel} = require('../models/user.model')
require('dotenv').config();
const chuoi_bi_mat = process.env.TOKEN_SEC_KEY;
// hàm kiểm tra đăng nhập
const api_auth = async (req, res , next)=>{
   // lấy token trong header
   let header_token = req.header ('Authorization');
   if(typeof(header_token) =='undefined' || header_token == null){
       return res.status(403).json({error: 'Không xác định token'});
   }
   // nếu có token thì bóc tách lấy chuỗi mã hóa trong token
   let token = header_token.replace('Bearer ','');
   // chú ý: có 1 dấu cách ở sau chữ Bearer
   // kiểm tra token hợp lệ hay không
   try {
       let data = jwt.verify(token, chuoi_bi_mat);
       console.log(data);
       // kiểm tra tồn tại user trong csdl
       let user = await userModel.findOne({_id: data._id, token:token});
       // có thể lấy theo ID sau đó so sánh token bằng code
       if(!user){
           throw new Error('Không xác định người dùng');
       }
       // ok tồn tại thông tin trong csdl
       req.user = user;
       req.token = token;


       next();// xác thực ok, cho phép làm tiếp các công việc tiếp theo
      
   } catch (error) {
       console.error(error);
       res.status(401).send({error: error.message})
   }
}
module.exports = {api_auth}
