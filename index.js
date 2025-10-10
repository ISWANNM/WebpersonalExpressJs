import express from "express";
import { engine } from "express-handlebars";
import { fileURLToPath } from "url";
import pool from "./config/db.js";
import bcrypt from "bcrypt";
import session from "express-session";
import flash from "express-flash";
import multer from "multer";
import path from "path";


function isLoggedIn(req, res, next) {
  if (!req.session.user) {
    req.flash("error", "Silakan login terlebih dahulu!");
    return res.redirect("/login");
  }
  next();
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Setup Handlebars
app.engine("hbs", engine({ extname: ".hbs", defaultLayout: "main" }));
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: "supersecret",
    resave: false,
    saveUninitialized: true,
  })
);
app.use(flash());

//Multer 
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "public", "uploads"));
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
  },
});

const upload = multer ({ storage: storage});

// buat user session tersedia di semua view
app.use((req, res, next) => {
  res.locals.user = req.session.user|| null;
  next();
});

// Routes
app.get("/", home);
app.get("/contact", (req, res) => res.render("contact", { title: "Contact" }));

// Show all projects 
app.get("/projects", requireLogin, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM projects ORDER BY id DESC");
    res.render("projects", {
      title: "My Projects",
      projects: result.rows,
    });
  } catch (err) {
    console.error(err);
    res.send("Database error: " + err.message);
  }
});

// Add project (CREATE) ketika login
app.post("/projects/add", upload.single("project_image"), async (req, res) => {
  const { project_name, description } = req.body;
  const project_image = req.file ? req.file.filename : null;

  try {
    await pool.query(
      "INSERT INTO projects (project_name, description, project_image, created_at) VALUES ($1, $2, $3, NOW())",
      [project_name, description, project_image]
    );
    res.redirect("/projects");
  } catch (err) {
    console.error("Error inserting project:", err);
    res.status(500).send("Database insert error");
  }
});

app.get("/login", login);
app.post("/login", handleLogin);
app.get("/register", (req, res) => {
  res.render("register", {
    title: "Register",
    success: req.flash("success"),
    error: req.flash("error"),
  });
});
app.post("/register", upload.single('profilePicture'), handleRegister);
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
    }
    res.redirect("/login");
  });
});



async function home(req, res) {
  try {
    // Ambil data semua project
    const result = await pool.query("SELECT * FROM projects ORDER BY id DESC");

    // Ambil data user (jika login)
    const usersData = req.session.user ? req.session.user.name : null;

    // Render home dengan projects
    res.render("home", {
      title: "Home",
      usersData,
      projects: result.rows,
    });
  } catch (err) {
    console.error("Database error:", err);
    res.send("Database error: " + err.message);
  }
}

function login(req, res) {
  res.render("login", {
    title: "Login",
    error: req.flash("error"),
    success: req.flash("success"),
  });
}
async function handleLogin(req, res) {
  const { email, password } = req.body;

  try {
    const result = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    const user = result.rows[0];

    if (!user) {
      req.flash("error", "Email tidak terdaftar");
      return res.redirect("/login");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      req.flash("error", "Password salah");
      return res.redirect("/login");
    }

    // Simpan session user
    req.session.user = {
      name: user.name,
      email: user.email,
    };

    req.flash("success", `Selamat datang, ${user.name}!`);
    res.redirect("/");
  } catch (err) {
    console.error(err);
    req.flash("error", "Terjadi kesalahan server");
    res.redirect("/login");
  }
}

function register (req, res) {
  res.render("register");
}

async function handleRegister(req,res) {
  const { name, email, password } = req.body;

  try {
    const isRegistered = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    if (isRegistered.rows.length > 0) {
      req.flash("error", "Email sudah terdaftar!");
      return res.redirect("/register");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const profilePicture = req.file ? req.file.filename : null;

    await pool.query(
      'INSERT INTO users (name, email, password, "profilePicture") VALUES ($1, $2, $3, $4)',
      [name, email, hashedPassword, profilePicture]
    );

    req.flash("success", "Registrasi berhasil! Silakan login.");
    res.redirect("/login");
  } catch (err) {
    console.error("Error inserting user:", err.message);
    req.flash("error", "Terjadi kesalahan server!");
    res.redirect("/register");
  }
}

// cek login
function requireLogin(req, res, next) {
  if (!req.session.user) {
    req.flash("error", "Silakan login terlebih dahulu!");
    return res.redirect("/login");
  }
  next();
}

app.listen(PORT, () => 
  console.log(`Server running at http://localhost:${PORT}`));
