const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true
        },

        phone: {
            type: String,
            required: true,
            unique: true
        },

        email: {
            type: String,
            required: true,
            unique: true
        },

        password: {
            type: String,
            required: true
        },

        role: {
            type: String,
            enum: ["passenger", "conductor"],
            required: true
        },

        rfid_uid: {
            type: String,
            default: null
        },

        wallet_balance: {
            type: Number,
            default: 0
        },

        isBlocked: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
