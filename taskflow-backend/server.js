const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db")

const app = express();

dotenv.config();
connectDB();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

app.get("/", (req,res)=>{
    res.send("Api is working");
})

app.listen(PORT,()=>{
    console.log(`server is running on http://localhost:${PORT}`);
})