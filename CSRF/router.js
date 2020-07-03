const fs = require("fs");
module.exports = {
  "/login": function (req, res) {
    res.setHeader("set-cookie", `token=${req.body.user}:${Date.now()}`);
    res.end();
  },
  "/getData": function (req, res) {
    const jsonData = read_database();
    const userData = getUserData(jsonData,req)
    res.end(JSON.stringify(userData));
  },
  "/shopping": function (req, res) {
    const jsonData = read_database();
    const userData = getUserData(jsonData,req)
    const sum = userData.shoppingcar.reduce((p, c) => p + c.price, 0);
    userData.balance -= sum;
    userData.shoppingcar = [];
    update_database(jsonData);
    res.end();
  },
  "/updateCarList": function (req, res) {
    const jsonData = read_database();
    const userData = getUserData(jsonData,req)
    userData.shoppingcar = req.body;
    update_database(jsonData);
    res.end()
  },
};

function getUserData(jsonData,req){
    const cookie = parseCookie(req.headers.cookie);
    const username = cookie.token?.split(":")[0];
    const userData = jsonData[username];
    return userData;
}

function parseCookie(str) {
  const cookieArr = str.split(";");
  const obj = {};
  cookieArr.forEach((item) => {
    const [key, val] = item.split("=");
    obj[key] = val;
  });
  return obj;
}
// 读取数据库
function read_database() {
  return JSON.parse(fs.readFileSync("./database.json"));
}
// 更新数据库
function update_database(data) {
  fs.writeFileSync("./database.json", JSON.stringify(data));
}
