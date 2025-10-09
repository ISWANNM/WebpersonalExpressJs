import express from "express";
import { engine } from "express-handlebars";
import path from "path";
import { fileURLToPath } from "url";
import pool from "./config/db.js";
import bcrypt from "bcrypt";
import session from "express-session";
import flash from "express-flash";
import { title } from "process";
import { error } from "console";

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
app.post("/projects/add", isLoggedIn, async (req, res) => {
  const { project_name, description } = req.body;
  try {
    await pool.query(
      "INSERT INTO projects (project_name, description, created_at) VALUES ($1, $2, NOW())",
      [project_name, description]
    );
    res.redirect("/projects");
  } catch (err) {
    console.error(err);
    res.send("Error inserting project: " + err.message);
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
app.post("/register", handleRegister);
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

  const hashedPassword = await bcrypt.hash(password, 10);

  const isRegistered = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
  if(isRegistered.rows.length > 0) {
    req.flash("error", "Email sudah terdaftar!");
    return res.redirect("/register");
  }

  try {
    await pool.query(
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3)",
      [name, email, hashedPassword]
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
