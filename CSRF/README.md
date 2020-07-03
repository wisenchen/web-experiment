## CSRF小实验

用node.js启动三个服务 webserver.js,webserver2.js,server.js

- webserver.js 模拟购物网站web端
- webserver2.js 进行CSRF攻击的网站
- server.js 购物网站服务端

访问 http://localhost/web1.html 地址 进入到 "购物网站"

### 步骤说明
1. 到"购物网站" 登录账号,账号名为 "wisen" 密码任意,
2. 登录成功后可添加商品到购物车列表
3. 点击右侧广告
4. 进入到"攻击网站"后点击攻击按钮
5. 返回到 "购物网站" 刷新发现购物车已被清空,并且余额已经减少