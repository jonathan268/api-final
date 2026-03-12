const mongoose = require('mongoose');
const {v4: uuidv4} = require('uuid');

const orderItemSchema = new mongoose.Schema({
    _id:{
        type:String,
        default:uuidv4
    },
    orderId:{
        type:String,
        ref: 'Order',
        required: true,
        index:true
    },
    productId:{
        type:String,
        ref: 'Product',
        required:true,
        index:true
    },
    quantity:{
        type:Number,
        required:true
    },
    price:{
        type:Number,
        required:true
    }
},{
    timestamps:true
});

orderItemSchema.index({order: 1, productId: 1});

const OrderItem = mongoose.model('OrderItem', orderItemSchema);
module.exports = OrderItem;