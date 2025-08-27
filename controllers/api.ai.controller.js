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

      // Trích xuất tên sản phẩm từ câu trả lời AI
      // Ví dụ: lấy các từ sau dấu ':' hoặc sau "bánh ..." hoặc tên trong ngoặc kép
      let keyword = message;
      const regexName = /bánh ([\w\s]+)/i;
      const regexColon = /: ([\w\s]+)/;
      const regexQuote = /"([^"]+)"/;
      if (botReply) {
        if (regexName.test(botReply)) {
          keyword = botReply.match(regexName)[1].trim();
        } else if (regexColon.test(botReply)) {
          keyword = botReply.match(regexColon)[1].trim();
        } else if (regexQuote.test(botReply)) {
          keyword = botReply.match(regexQuote)[1].trim();
        }
      }

      // Tìm sản phẩm gợi ý dựa trên keyword trích xuất từ câu trả lời AI
      const suggestedProducts = await aiController.findSuggestedProducts(keyword);

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
      // Lấy danh sách sản phẩm trước khi xử lý
      const products = await aiController.getProductsForAI();
      // Nếu người dùng hỏi "chỉ muốn" một loại bánh cụ thể, chỉ trả về sản phẩm đúng loại đó
      const onlyMatchRegex = /chỉ muốn ([\w\s]+)/i;
      const onlyMatch = userMessage.match(onlyMatchRegex);
      if (onlyMatch) {
        const keyword = onlyMatch[1].trim().toLowerCase();
        const strictProducts = products.filter(product => {
          const productName = product.name.toLowerCase();
          return productName.includes(keyword);
        });
        if (strictProducts.length > 0) {
          return strictProducts.map(product => ({
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
          }));
        } else {
          // Không tìm thấy đúng loại bánh
          return [];
        }
      }
    try {
      const products = await aiController.getProductsForAI();
      console.log(`🔍 Tìm kiếm sản phẩm cho: "${userMessage}"`);
      console.log(`📦 Tổng số sản phẩm có sẵn: ${products.length}`);
      if (products.length === 0) return [];

      const message = userMessage.toLowerCase();
      let filteredProducts = [];

      // Tìm kiếm chính xác theo tên sản phẩm
      const nameMatches = products.filter(product => {
        const productName = product.name.toLowerCase();
        return productName.includes(message);
      });

      // Tìm kiếm theo danh mục
      const categoryMatches = products.filter(product => {
        const categoryName = (product.category_id?.name || '').toLowerCase();
        return categoryName.includes(message);
      });


      // Gom kết quả, ưu tiên theo thứ tự: tên > danh mục > thành phần
      filteredProducts = [...nameMatches, ...categoryMatches, ...filteredProducts];

      // Nếu vẫn không có kết quả, thử tìm kiếm từng từ trong câu hỏi
      if (filteredProducts.length === 0) {
        const messageWords = message.split(/\s+/).filter(w => w.length > 2);
        filteredProducts = products.filter(product => {
          const productName = product.name.toLowerCase();
          const categoryName = (product.category_id?.name || '').toLowerCase();
          const desc = (product.description || '').toLowerCase();
          return messageWords.some(word =>
            productName.includes(word) ||
            categoryName.includes(word) ||
            desc.includes(word)
          );
        });
      }

      // Nếu vẫn không có, trả về top sản phẩm phổ biến
      if (filteredProducts.length === 0) {
        filteredProducts = products.sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 3);
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