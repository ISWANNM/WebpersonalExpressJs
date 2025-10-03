import express from "express";
import { engine } from "express-handlebars";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Data sementara (simulasi database)
let projects = [
  { id: 1, title: "Portfolio Website", description: "Personal portfolio using Bootstrap" },
  { id: 2, title: "Todo App", description: "Simple todo list with Express" },
];

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

app.get("/projects", (req, res) => {
  res.render("projects", { title: "My Projects", projects });
});

app.get("/projects/:id", (req, res) => {
  const { id } = req.params;
  const project = projects.find(p => p.id == id);
  if (!project) return res.status(404).send("Project not found");
  res.render("project-detail", { title: "Project Detail", project });
});

app.post("/projects/add", (req, res) => {
  const { title, description } = req.body;
  const newProject = {
    id: projects.length + 1,
    title,
    description,
  };
  projects.push(newProject);
  res.redirect("/projects");
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
