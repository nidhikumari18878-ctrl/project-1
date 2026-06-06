require("dotenv").config();

const express = require("express");
const app = express();
const cookieParser = require('cookie-parser');
const path = require("path");
const expressSession = require("express-session");
const flash = require("connect-flash");
const mongoose = require("mongoose");
const profileRoutes = require("./routes/profileRoutes");
const authRoutes  = require("./routes/authRoutes");
const opportunityModel = require("./models/opportunityModel");
const applicationModel = require("./models/applicationModel");
const userModel = require("./models/user");
const multer = require("multer");
const Resume = require("./models/resumeModel");


app.set("view engine", 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());
app.use(flash());
app.use(expressSession({
    resave: false,
    saveUninitialized: false,
    secret: process.env.EXPRESS_SESSION_SECRET
}));
const mongoURI = process.env.MONGODB_URI ||"mongodb://127.0.0.1:27017/miniproject";
console.log("Connecting to MongoDB at: ", mongoURI); // Debugging line
// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error(err));

// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ storage: storage });
const isLoggedIn=require("./middlewares/isLoggedIn");

app.use("/", authRoutes);
app.use("/", profileRoutes);
// Routes
app.get("/", (req, res) => {
    res.render("index");
});

app.get("/application", isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({ email: req.user.email });
    let applications = await applicationModel.find({ user: user._id });
    res.render("application", { applications });
});

app.get("/resume", async (req, res) => {
    const resumeData = await Resume.findOne().sort({ createdAt: -1 });
    res.render("resume", { resumeData });
});

app.post("/upload-resume", upload.single("resume"), async (req, res) => {
    const filename = req.file.filename;
    const skills = ["HTML", "CSS", "JavaScript", "React"];
    const atsScore = 80;
    const missingSkills = ["Node.js", "MongoDB", "DSA"];
    const suggestions = ["Add more projects", "Learn MongoDB", "Improve DSA"];

    await Resume.create({ filename, skills, atsScore, missingSkills, suggestions });
    res.redirect("/resume");
});

app.get("/dashboard", isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({
        email: req.user.email
    });

    res.render("dashboard", { user });
});
// app.get("/dashboard", isLoggedIn, async (req, res) => {
//     let user = await userModel.findOne({ email: req.user.email }).populate("posts");
//     res.render('dashboard', { user });
// });

app.get("/update-profile", isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({ email: req.user.email });
    res.render("update-profile", { user });
});

app.post("/update-profile", isLoggedIn, async (req, res) => {
    let { name, email, image } = req.body;
    await userModel.findOneAndUpdate({ email: req.user.email }, { name, email, image });
    res.redirect("/profile");
});

app.get("/opportunities", isLoggedIn, async (req, res) => {
    try {
        const search = req.query.search || "";
        const opportunities = await opportunityModel.find({
            companyName: {
                $regex: search,
                $options: "i"
            }
        });
        res.render("opportunities", { opportunities, search });
    } catch (err) {
        res.send(err.message);
    }
});

app.get("/seed", async (req, res) => {
    await opportunityModel.insertMany([
        {
            companyName: "Google",
            role: "Software Engineer Intern",
            type: "Internship",
            location: "Bangalore",
            stipend: "₹80,000/month",
            deadline: "2026-08-30",
            applyLink: "https://careers.google.com",
            logo: "https://logo.clearbit.com/google.com",
            skills: ["DSA", "JavaScript", "React"]
        },
        {
            companyName: "Microsoft",
            role: "Frontend Developer Intern",
            type: "Internship",
            location: "Hyderabad",
            stipend: "₹60,000/month",
            deadline: "2026-09-05",
                       applyLink: "https://careers.microsoft.com",
            logo: "https://logo.clearbit.com/microsoft.com",
            skills: ["HTML", "CSS", "React"]
        }
    ]);
    res.send("Seeded");
});

app.get("/track/:id", isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({ email: req.user.email });
    let opportunity = await opportunityModel.findOne({ _id: req.params.id });

    await applicationModel.create({
        companyName: opportunity.companyName,
        role: opportunity.role,
        status: "Applied",
        location: opportunity.location,
        package: opportunity.stipend,
        user: user._id
    });

    res.redirect("/application");
});

app.get("/logout", (req, res) => {
    res.cookie("token", "");
    res.redirect('/login');
});

app.listen(5000, () => {
    console.log("Server is running on port 5000");
});

