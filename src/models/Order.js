const mongoose = require('mongoose');
const {v4: uuidv4} = require('uuid');

const orderSchema = new mongoose.Schema({
    _id:{
        type:String,
        default:uuidv4
    },

    userId:{
        type:String,
        ref: 'User',
        required: true,
        index:true
    },
    status:{
        type:String,
        enum:['pending', 'paid', 'shipped', 'delivered', 'cancelled'],
        default: 'pending',
        index:true
    },
    totalAmount:{
        type:Number,
        required:true
    },
    items:[{
        productId:{
            type:String,
            ref: 'Product',
            required:true
        },
        quantity:{
            type:Number,
            required:true
        },
        price:{
            type:Number,
            required:true
        }
    }],
},{
    timestamps:true
});

orderSchema.index({'items.productId': 1});

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;