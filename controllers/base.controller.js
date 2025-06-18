// Nhận vào một Mongoose Model, trả về object có 5 method CRUD
module.exports = Model => ({
  // GET /…  
  getList: async (req, res) => {
    try {
      const data = await Model.find();
      res.json({ msg: 'OK', data });
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: err.message });
    }
  },

  // GET /…/:id  
  GetOne: async (req, res) => {
    try {
      const item = await Model.findById(req.params.id);
      res.json({ msg: 'OK', data: item });
    } catch (err) {
      res.status(404).json({ msg: err.message, data: null });
    }
  },

  // POST /…  
  Add: async (req, res) => {
    try {
      const obj = new Model(req.body);
      const saved = await obj.save();
      res.json({ msg: 'OK', data: saved });
    } catch (err) {
      res.status(400).json({ msg: err.message, data: null });
    }
  },

  // PUT /…/:id  
  Edit: async (req, res) => {
    try {
      const updated = await Model.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
      res.json({ msg: 'OK', data: updated });
    } catch (err) {
      res.status(400).json({ msg: err.message, data: null });
    }
  },

  // DELETE /…/:id  
  Delete: async (req, res) => {
    try {
      await Model.findByIdAndDelete(req.params.id);
      res.json({ msg: 'OK' });
    } catch (err) {
      res.status(400).json({ msg: err.message });
    }
  }
});
