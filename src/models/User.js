const mongoose = require('mongoose');
const {v4: uuidv4} = require ('uuid');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    _id:{
        type:String,
        default:uuidv4

    },
    email:{
        type:String,
        required:[true, "L'email est requis"],
        unique: true,
        lowercase:true,
        match:[/^\S+@\S+\.\S+$/, 'Veuillez utiliser un email valide']
    },
    name:{
        type:String,
        required:[true, "Le nom est requis"],
        trim:true
    },
    roles: [{
        type: String,
        ref: 'Role'
    }],
    password:{
        type:String,
        required:[true, "Le mot de passse est requis"],
        select:false

    },
    

},{
    timestamps:true,
    toJSON:{virtual:true},
    toObject:{virtual:true}
});

userSchema.methods.comparePassword = async function(candidatePassword){
    return bcrypt.compare(candidatePassword, this.password);
}

const User = mongoose.model('User', userSchema);
module.exports = User;