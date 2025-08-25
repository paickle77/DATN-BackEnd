const { GoogleGenerativeAI } = require("@google/generative-ai");
const Product = require('../models/product.model');
const Category = require('../models/category.model');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const aiController = {
  // Lấy thông tin sản phẩm để cung cấp cho AI
  getProductsForAI: async () => {
    try {
      const products = await Product.find({ is_active: true })
        .populate('category_id', 'name description')
        .populate('branch_id', 'name address')
        .populate('ingredient_id', 'name description')
        .select('name description price discount_price rating stock image_url');
      
      return products;
    } catch (error) {
      console.error('Error getting products for AI:', error);
      return [];
    }
  },

  // Tạo context cho AI với thông tin sản phẩm
  createAIContext: async () => {
    const products = await aiController.getProductsForAI();
    
    const productContext = products.map(product => {
      const actualPrice = product.discount_price > 0 ? product.discount_price : product.price;
      return `- ${product.name}: ${product.description || 'Không có mô tả'} - Giá: ${actualPrice.toLocaleString('vi-VN')}đ - Rating: ${product.rating}/5 - Còn lại: ${product.stock} - Danh mục: ${product.category_id?.name || 'Chưa phân loại'}`;
    }).join('\n');

    return `
Bạn là chatbot tư vấn của CakeShop - cửa hàng bánh ngọt hàng đầu Việt Nam.

THÔNG TIN SẢN PHẨM HIỆN CÓ:
${productContext}

QUY TẮC TƒƒU VẤN:
1. Luôn thân thiện, nhiệt tình và chuyên nghiệp
2. Tư vấn sản phẩm phù hợp với nhu cầu khách hàng
3. Đưa ra gợi ý cụ thể về sản phẩm từ danh sách trên
4. Giải thích lý do tại sao sản phẩm phù hợp
5. Đề xuất combo hoặc sản phẩm kèm theo nếu phù hợp
6. Nếu không có sản phẩm phù hợp, hãy gợi ý sản phẩm gần nhất
7. Luôn kết thúc bằng câu hỏi để tiếp tục hỗ trợ khách hàng

PHONG CÁCH:
- Sử dụng tiếng Việt tự nhiên, thân thiện
- Emoji phù hợp để tạo không khí vui vẻ
- Không quá dài dòng, ngắn gọn súc tích
- Tập trung vào lợi ích của khách hàng
`;
  },

  // API chat với Gemini AI
  chat: async (req, res) => {
    try {
      const { message, conversation_history } = req.body;

      if (!message) {
        return res.status(400).json({
          success: false,
          message: 'Tin nhắn không được để trống'
        });
      }

      // Tạo context cho AI
      const aiContext = await aiController.createAIContext();
      
      // Chuẩn bị lịch sử hội thoại
      let conversationText = aiContext + '\n\nHỘI THOẠI:\n';
      
      if (conversation_history && Array.isArray(conversation_history)) {
        conversation_history.forEach(msg => {
          conversationText += `${msg.isUser ? 'Khách hàng' : 'Bot'}: ${msg.text}\n`;
        });
      }
      
      conversationText += `Khách hàng: ${message}\nBot: `;

      // Gọi Gemini AI
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(conversationText);
      const response = await result.response;
      const botReply = response.text();

      // Tìm sản phẩm gợi ý dựa trên tin nhắn người dùng
      const suggestedProducts = await aiController.findSuggestedProducts(message);

      return res.json({
        success: true,
        data: {
          message: botReply.trim(),
          timestamp: new Date(),
          suggested_products: suggestedProducts
        }
      });

    } catch (error) {
      console.error('AI Chat Error:', error);
      
      // Fallback response khi AI không hoạt động
      const fallbackResponses = [
        "Xin lỗi, tôi đang gặp sự cố kỹ thuật. Bạn có thể cho tôi biết bạn đang tìm kiếm loại bánh nào không? 🍰",
        "Hệ thống đang bảo trì, nhưng tôi vẫn có thể hỗ trợ bạn! Bạn muốn tư vấn về bánh sinh nhật, bánh ngọt hay đồ uống ạ? ☕",
        "Tôi đang cập nhật thông tin mới nhất. Trong lúc này, bạn có thể xem các sản phẩm hot nhất của chúng tôi không? 🔥"
      ];
      
      const randomResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
      
      return res.json({
        success: true,
        data: {
          message: randomResponse,
          timestamp: new Date(),
          is_fallback: true,
          suggested_products: []
        }
      });
    }
  },

  // Tìm sản phẩm gợi ý dựa trên từ khóa người dùng
  findSuggestedProducts: async (userMessage) => {
    try {
      const products = await aiController.getProductsForAI();
      console.log(`🔍 Tìm kiếm sản phẩm cho: "${userMessage}"`);
      console.log(`📦 Tổng số sản phẩm có sẵn: ${products.length}`);
      
      if (products.length === 0) {
        return [];
      }

      const message = userMessage.toLowerCase();
      let filteredProducts = [];

      // 1. Tìm kiếm chính xác theo tên sản phẩm
      const exactMatches = products.filter(product => {
        const productName = product.name.toLowerCase();
        const productDesc = (product.description || '').toLowerCase();
        
        // Tách từ khóa từ tin nhắn người dùng
        const messageWords = message.split(/\s+/);
        
        // Kiểm tra nếu tên sản phẩm chứa từ khóa hoặc ngược lại
        const isMatch = messageWords.some(word => 
          word.length > 2 && (
            productName.includes(word) || 
            productDesc.includes(word) ||
            word.includes(productName.split(' ')[0]) // Kiểm tra từ đầu tiên của tên sản phẩm
          )
        ) || messageWords.join(' ').includes(productName);
        
        if (isMatch) {
          console.log(`✅ Exact match: ${product.name}`);
        }
        
        return isMatch;
      });

      console.log(`🎯 Exact matches found: ${exactMatches.length}`);

      if (exactMatches.length > 0) {
        filteredProducts = exactMatches;
      } else {
        // 2. Tìm kiếm mở rộng dựa trên danh mục và thành phần
        const expandedMatches = products.filter(product => {
          const productName = product.name.toLowerCase();
          const productDesc = (product.description || '').toLowerCase();
          const categoryName = (product.category_id?.name || '').toLowerCase();
          
          // Từ khóa mở rộng
          const keywords = {
            cake: ['bánh', 'cake', 'gato'],
            cream: ['kem', 'cream'],
            chocolate: ['socola', 'chocolate', 'choco'],
            tiramisu: ['tiramisu', 'mascarpone'],
            cupcake: ['cupcake', 'bánh nướng'],
            fruit: ['trái cây', 'cam', 'dâu', 'fruit', 'orange'],
            birthday: ['sinh nhật', 'birthday'],
            sweet: ['ngọt', 'sweet', 'dessert'],
            test: ['test', 'thử nghiệm', '2222', 'ngon']
          };

          // Kiểm tra từng nhóm từ khóa
          for (const [category, words] of Object.entries(keywords)) {
            if (words.some(word => message.includes(word))) {
              if (productName.includes(category) || 
                  productDesc.includes(category) ||
                  categoryName.includes(category) ||
                  words.some(w => productName.includes(w) || productDesc.includes(w))) {
                console.log(`🔍 Expanded match: ${product.name} (category: ${category})`);
                return true;
              }
            }
          }

          return false;
        });

        console.log(`🎯 Expanded matches found: ${expandedMatches.length}`);

        if (expandedMatches.length > 0) {
          filteredProducts = expandedMatches;
        } else {
          // 3. Nếu vẫn không tìm thấy, sử dụng tìm kiếm fuzzy (mờ)
          const fuzzyMatches = products.filter(product => {
            const productName = product.name.toLowerCase();
            const productDesc = (product.description || '').toLowerCase();
            
            // Tách từ từ tin nhắn và kiểm tra độ tương tự
            const messageWords = message.replace(/[^\w\s]/gi, '').split(/\s+/);
            const isMatch = messageWords.some(word => {
              if (word.length < 3) return false;
              
              // Kiểm tra substring
              return productName.includes(word.substring(0, 3)) || 
                     productDesc.includes(word.substring(0, 3)) ||
                     word.includes(productName.substring(0, 3));
            });
            
            if (isMatch) {
              console.log(`🔍 Fuzzy match: ${product.name}`);
            }
            
            return isMatch;
          });

          console.log(`🎯 Fuzzy matches found: ${fuzzyMatches.length}`);

          if (fuzzyMatches.length > 0) {
            filteredProducts = fuzzyMatches;
          }
        }
      }

      // 4. Nếu vẫn không có kết quả, trả về sản phẩm phổ biến
      if (filteredProducts.length === 0) {
        console.log(`📦 Không tìm thấy sản phẩm phù hợp, trả về top sản phẩm`);
        filteredProducts = products
          .sort((a, b) => (b.rating || 0) - (a.rating || 0))
          .slice(0, 3);
      } else {
        // Sắp xếp theo độ phù hợp: rating cao và tên gần giống nhất
        filteredProducts = filteredProducts
          .sort((a, b) => {
            // Ưu tiên sản phẩm có tên chứa từ khóa chính xác hơn
            const aNameMatch = a.name.toLowerCase().includes(message.split(' ')[0]);
            const bNameMatch = b.name.toLowerCase().includes(message.split(' ')[0]);
            
            if (aNameMatch && !bNameMatch) return -1;
            if (!aNameMatch && bNameMatch) return 1;
            
            // Sau đó sắp xếp theo rating
            return (b.rating || 0) - (a.rating || 0);
          })
          .slice(0, 3);
      }

      // Loại bỏ sản phẩm trùng lặp
      const uniqueProducts = filteredProducts.filter((product, index, self) => 
        index === self.findIndex(p => p._id.toString() === product._id.toString())
      );

      console.log(`🎉 Kết quả cuối cùng: ${uniqueProducts.length} sản phẩm`);
      uniqueProducts.forEach(p => console.log(`   - ${p.name}`));

      return uniqueProducts.map(product => ({
        id: product._id,
        name: product.name,
        description: product.description || '',
        price: product.price,
        discount_price: product.discount_price,
        actual_price: product.discount_price > 0 ? product.discount_price : product.price,
        image_url: product.image_url,
        rating: product.rating || 0,
        stock: product.stock || 0,
        category: product.category_id,
        branch: product.branch_id
      }));

    } catch (error) {
      console.error('Error finding suggested products:', error);
      return [];
    }
  },

  // API lấy gợi ý nhanh
  getQuickSuggestions: async (req, res) => {
    try {
      const products = await aiController.getProductsForAI();
      
      // Lấy top sản phẩm theo rating và tồn kho
      const topProducts = products
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 4)
        .map(product => ({
          text: `Tư vấn về ${product.name}`,
          type: 'product_inquiry',
          product_id: product._id
        }));

      const suggestions = [
        { text: "Tôi cần bánh sinh nhật", type: "birthday_cake" },
        { text: "Có bánh ngọt gì mới không?", type: "new_products" },
        { text: "Giá cả như thế nào?", type: "pricing" },
        { text: "Làm sao để đặt hàng?", type: "order_guide" },
        ...topProducts
      ];

      return res.json({
        success: true,
        data: suggestions.slice(0, 6) // Lấy tối đa 6 gợi ý
      });

    } catch (error) {
      console.error('Quick Suggestions Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Không thể lấy gợi ý'
      });
    }
  },

  // API lấy thông tin sản phẩm để hiển thị trong chat
  getProductInfo: async (req, res) => {
    try {
      const { product_id } = req.params;
      
      const product = await Product.findById(product_id)
        .populate('category_id', 'name description')
        .populate('branch_id', 'name address phone')
        .populate('ingredient_id', 'name description');

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy sản phẩm'
        });
      }

      return res.json({
        success: true,
        data: {
          id: product._id,
          name: product.name,
          description: product.description,
          price: product.price,
          discount_price: product.discount_price,
          actual_price: product.discount_price > 0 ? product.discount_price : product.price,
          image_url: product.image_url,
          rating: product.rating,
          stock: product.stock,
          category: product.category_id,
          branch: product.branch_id,
          ingredients: product.ingredient_id
        }
      });

    } catch (error) {
      console.error('Get Product Info Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy thông tin sản phẩm'
      });
    }
  }
};

module.exports = aiController;