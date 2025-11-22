const express = require("express");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

const distPath = path.join(__dirname, "mi-frontend", "dist", "mi-frontend", "browser");

app.use(express.static(distPath));

app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(port, () => {
  console.log("Frontend running on port", port);
});
