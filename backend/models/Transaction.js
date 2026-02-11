const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    type: {
        type: String,
        enum: ["CREDIT", "DEBIT"],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    description: String
}, { timestamps: true });

module.exports = mongoose.model("Transaction", transactionSchema);
