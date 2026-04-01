import mongoose from "mongoose";
import colors from "colors";
const connectDB = async () => {
    try {
        //LOU YING-WEN, A0338520J
        const conn = await mongoose.connect(process.env.MONGO_URL, {
            maxPoolSize: 1000,
        });
        console.log(`Connected To Mongodb Database ${conn.connection.host}`.bgMagenta.white);
    } catch (error) {
        console.log(`Error in Mongodb ${error}`.bgRed.white);
    }
};

export default connectDB;