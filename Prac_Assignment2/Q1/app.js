const express = require("express");
const multer = require("multer");
const { body, validationResult } = require("express-validator");
const path = require("path");
const fs = require("fs");

const app = express();

// set view engine
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

// GET form
app.get("/", (req, res) => {
  res.render("form", { errors: [], old: {} });
});

// POST form with validation + file upload
app.post(
  "/register",
  upload.fields([{ name: "profilePic", maxCount: 1 }, { name: "otherPics" }]),
  [
    body("username").notEmpty().withMessage("Username is required"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 chars"),
    body("confirmPassword").custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Passwords do not match");
      }
      return true;
    }),
    body("email").isEmail().withMessage("Invalid email"),
    body("gender").notEmpty().withMessage("Gender is required"),
    body("hobbies").isArray({ min: 1 }).withMessage("Select at least one hobby")
  ],
  (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // return form with errors and old values
      return res.render("form", { errors: errors.array(), old: req.body });
    }

    const profilePic = req.files["profilePic"] ? req.files["profilePic"][0].filename : null;
    const otherPics = req.files["otherPics"] ? req.files["otherPics"].map(f => f.filename) : [];

    const userData = {
      username: req.body.username,
      email: req.body.email,
      gender: req.body.gender,
      hobbies: req.body.hobbies,
      profilePic,
      otherPics
    };

    // Save formatted data in a text file for download
    const filePath = path.join(__dirname, "public", "uploads", `${req.body.username}-data.txt`);
    const fileContent = `
      Username: ${userData.username}
      Email: ${userData.email}
      Gender: ${userData.gender}
      Hobbies: ${userData.hobbies.join(", ")}
      Profile Pic: ${profilePic}
      Other Pics: ${otherPics.join(", ")}
    `;
    fs.writeFileSync(filePath, fileContent);

    res.render("result", { user: userData, file: `${req.body.username}-data.txt` });
  }
);

// file download route
app.get("/download/:filename", (req, res) => {
  const file = path.join(__dirname, "public", "uploads", req.params.filename);
  res.download(file);
});

// server
app.listen(3000, () => console.log("Server running at http://localhost:3000"));
