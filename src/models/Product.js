const mongoose = require('mongoose');
const {v4: uuidv4} = require('uuid');
const productSchema = new mongoose.Schema({
    _id:{
        type:String,
        default: uuidv4
    },

    name:{
        type:String,
        required: true,
        index:true
    },
    description:{
        type:String,
        required:true,
        index:true
    },
    price:{
        type:Number,
        default:0
    },
    image:{
        type:String
    }
    
},{
    timestamps:true
});

const Product = mongoose.model('Product', productSchema);
module.exports = Product;