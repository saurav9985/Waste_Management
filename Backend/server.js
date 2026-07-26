const mongoose = require('mongoose');
const { Schema } = mongoose;
main().then(()=>{
    console.log("connected");
}).catch((err)=>{
    console.log(err);
})

async function main(){
    await mongoose.connect('mongodb://127.0.0.1/array');
}

const userSchema = new Schema({
    username:String,
    email:String,
})

const postSchema = new Schema({
    content:String,
    likes:Number,
    user:{
        type:Schema.Types.ObjectId,
        ref:"User"
    }
})

const User = mongoose.model("User",userSchema);
const Post = mongoose.model("Post",postSchema);

// const addData = async ()=>{
//     const user1 = new User({
//         username:"Rahul kumar",
//         email:"rahul@2009gmail.com"
//     });
//      await user1.save();
//     let posts = Post.insertMany(
//         [{content:"hello shiva how are you?",
//             likes:20,
//             user:user1,

//          },
//          {
//             content:"I am fine what about you?",
//             likes:30,
//             user:user1,
//          },
//          {
//             content:"I am also fine here, what about your vidyalay?",
//             likes:2000,
//             user:user1,
//          }
//         ])
// }


// addData();

const getdata = async()=>{
    let res = await Post.findOne({}).populate("user","username");
    console.log(res);
}

getdata();
