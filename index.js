import express from "express";
import { engine } from "express-handlebars";
import path from "path";
import { fileURLToPath } from "url";
import pool from "./config/db.js";

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

// Routes
app.get("/", (req, res) => res.render("home", { title: "Home" }));
app.get("/contact", (req, res) => res.render("contact", { title: "Contact" }));
// Show all projects
app.get("/projects", async (req, res) => {
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

// Add project form page 
// app.get("/projects/add", (req, res) => {
//   res.render("add-project", { title: "Add Project" });
// });

// Add project (CREATE)
app.post("/projects/add", async (req, res) => {
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

app.listen(PORT, () => 
  console.log(`Server running at http://localhost:${PORT}`));
