const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

counterSchema.statics.getNextSequence = async function (name, year) {
  const id = `${name}_${year}`;
  const updated = await this.findOneAndUpdate(
    { _id: id },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return updated.seq;
};

module.exports = mongoose.model('Counter', counterSchema);
