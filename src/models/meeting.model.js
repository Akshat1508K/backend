import mongoose, { Schema } from "mongoose";


const meetingSchema = new Schema(
    {
        user_id: { type: String },
        meetingCode: { type: String, required: true },
        date: { type: Date, default: Date.now, required: true }
    }
)

const Meeting = mongoose.model("Meeting", meetingSchema);

export {Meeting};//jab boht kuch karna h export from a single file 

//when only ek cheez karni ho tab 
//export defalut {Meeting};