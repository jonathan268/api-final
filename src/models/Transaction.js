const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const transactionSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: uuidv4,
  },

  paymentId: {
    type: String,
    ref: "Payment",
    required: true,
  },
  transactionId: {
    type: String,
    required: true,
    unique: true,
  },
  type: {
    type: String,
    enum: ["AUTHORIZE", "CAPTURE", "REFUND", "PAYMENT"],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["success", "failed"],
    required: true,
  },
},{
    timestamps:true
});

transactionSchema.index({'paymentId': 1});

const Transaction = mongoose.model('Transaction', transactionSchema);
module.exports = Transaction;
