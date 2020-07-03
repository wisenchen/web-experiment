const HTTP = require("http");
const URL = require("url");
// 数据
const database = [
  {
    id: "1001",
    name: "wisen",
    age: "18",
    tag: "cool",
  },
];

// 创建一个http服务
const server = HTTP.createServer((req, res) => {
  const { query, pathname } = URL.parse(req.url);
  if (pathname == "/getUserInfo") {
    const { cb, key } = parseQuery(query);
    const userInfo = database.filter((item) => item.name == key)[0];
    res.end(`${cb}(${JSON.stringify(userInfo)})`);
  }
  res.end();
});

// 监听3001端口
server.listen(3001, () => {
  console.log("服务已启动，访问web.html查询数据试试吧！");
});

function parseQuery(query) {
  const args = query.split("&");
  const obj = {};
  args.forEach((item) => {
    const [key, val] = item.split("=");
    obj[key] = val;
  });
  return obj;
}
