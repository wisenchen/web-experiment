const HTTP = require("http");
const URL = require("url");
const fs = require("fs");
HTTP.createServer((req, res) => {
  const { pathname } = URL.parse(req.url);
  if (pathname == "/" || pathname == "/index.html") {
    const data = fs.readFileSync("./index.html");
    res.end(data);
  }
  if (pathname == "/login") {
    const data = fs.readFileSync("./login.html");
    res.end(data);
  }
  res.end();
}).listen(80, () => {
  console.log("Your are application already running here http://localhost:80");
});
