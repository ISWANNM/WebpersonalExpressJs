import express from "express";

const app = express();
const port = 3000;


app.use("/assets", express.static("src/assets"));

app.set("view engine", "hbs");
app.set("views", "src/views");

app.get("/home", (req, res) => {
  res.render("index", { title: "Home" });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
