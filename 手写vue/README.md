# 实现简版CVUE

## 运行环境

 1. 使用es6的module模块化 直接打开cvue.html会报错
    可以在vscode中安装一个`live Server`插件 右键选择 `"open with live Server"`打开

 2. 或者在index.html中引入 cvue.js  单文件
## 实现功能
1. 数据响应式
    - 数组响应式
    - 新增数据
2. 模板解析
    - 简单的`{{variable}}`这种格式 只有一个变量的解析 (不实现表达式、运算等)
    - 实现指令
      - c-model
      - c-text
      - c-html
    - 实现事件
      - c-click/@click
3. 依赖收集
    - 每一个响应式数据对应一个Dep
    - Dep中收集所有依赖于该数据的Watcher
    - 每个Watcher有其对应的更新函数

### 创建***CVue*** `class`

在构造器中我们需要做的事情：

1. 合并配置项
2. 获取根节点
3. 代理data配置项中的数据

#### 合并配置项

```Js
class CVue {
  constructor(options){
    // 配置项挂到实例下
    for(let key in options){
      this['$'+key] = options[key];
    }
  }
} 
```
#### 获取根节点

这里直接通过 `document.querySelector` 方法获取根元素
```Js
class CVue {
  constructor(options){
    // 配置项挂到实例下
    for(let key in options){
      this['$'+key] = options[key];
    }
     //  获取根节点
    this.$el = document.querySelector(this.$el);
  }
} 
```
#### 代理data

对data选项做一层代理实现 可以直接通过 实例访问到 data中的数据

例:
```Js
const app = new CVue({
  el: "#app",
  data: {
    count: 1,
    }
  }
})
// 我们希望通过 app.count 能直接访问到 data里面的count 
```
封装 proxy方法
```Javascript
  /**
   *
   * @param {*} vm 即需要通过vm可直接返回数据
   * @param {*} sourceKey 原key名
   * @memberof CVue
   */
function proxy (vm, sourceKey){
  Object.keys(vm[sourceKey]).forEach(key => {
    Object.defineProperty(vm, key, {
      get() {
        return vm[sourceKey][key];
      },
      set(newVal) {
        vm[sourceKey][key] = newVal;
      }
    })
  })
}
```
在构造器中使用proxy方法代理data
```Js
class CVue {
  constructor(options){
    // 配置项挂到实例下
    for(let key in options){
      this['$'+key] = options[key];
    }
    // 获取根节点
    this.$el = document.querySelector(this.$el);
    proxy(this, '$data')
  }
} 
```

### 数据响应式处理

创建 observe.js


```JS
class Observer {
  constructor(value) {
    this.value = value
    this.dep = new Dep()
    this.observe(value);
  }
  observe(obj) {
    if (typeof obj !== 'object') {
      return;
    }
    if (Array.isArray(obj)) { // 如果是一个数组
      //  覆盖其原型
      obj.__proto__ = arrMethods;
      this.observeArray(obj); // 遍历数组
    } else {
      this.walk(obj); // 递归遍历对象
    }
  }
  observeArray(arr) {
    for (let i = 0; i < arr.length; i++) {
      this.observe(arr[i]);
      this.defineReactive(arr, i, arr[i]);
    }
  }
  walk(obj) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      if (keys[i] == '__ob__') continue; // 避免死循环
      this.defineReactive(obj, keys[i], obj[keys[i]])
    }
  }

  defineReactive(obj, key, val) {
    this.observe(val);// 我们需要劫持的属性可能是一个对象 所以需要递归 
    let dep = new Dep();
    // 官方的做法是为子响应式数据重新创建一个 Observer实例  而这里不同 是在  defineReactive 里给  obj.__ob__ 传递 当前observer实例引用
    obj.__ob__ = this;
    let childOb;
    if (typeof val == 'object' && val.__ob__) {
      childOb = val.__ob__;
    }
    Object.defineProperty(obj, key, {
      enumerable: true,
      configurable: true,
      get() {
        // 每当触发一次get 需要判断是否是 Watcher触发的(即 Dep.target存在则为Watcher触发的get)  这时需要收集该响应式数据（当前key）的Watcher实例到Dep中
        if (Dep.target) {
          dep.addDep();
          childOb && childOb.dep.addDep() // 如果存在子ob（即该数据中有子对象） 也要收集该Watcher
        }
        return val;
      },
      set(newVal) {
        if (val !== newVal) {
          val = newVal;
          // 通知更新
          dep.notify();
        }
      }
    })
  }
}
```
我们在`defineReactive`方法里使用`Object.defineProperty`来实现对数据的劫持

通过`observe`方法实现递归遍历对象和数组

`observeArray`方法用来对数组现有元素进行劫持 

#### 数组响应式的实现

`Object.defineProperty` 方法并不能对数组的新增元素和删除等进行劫持 这也是vue2.0数据响应式的缺陷
例如一个数组 arr = [1,2,3]  如果直接对 arr[3] = 4; 则监听不到修改和获取 同理push等方法也不行 

这里vue的做法是对数组的原型做了一层覆盖 即把所有能修改原始数组的方法都重写一次 在其中监听变化

#### 创建array.js
```JS
/**
 * @fileDesc 数组响应式处理 用以覆盖需要响应式的数组原型
 */ 


const arrApi = ['push','pop','shift','unshift','splice','reverse','sort']; // 现具有修改原数组能力的几个数组方法

// 由于只覆盖几个方法但是其余方法保留 所以不能直接覆盖 Array.prototype 需要先做个备份
const arrProto = Array.prototype;  

// 相当于在Array.prototype前加一层 arrMethods 所以如果访问arrMethods不存在的方法 还是会到数组原型上找
const arrMethods = Object.create(arrProto); 


arrApi.forEach(key => {
  // 对原方法封装一层
  arrMethods[key] = function(...args){

    // 执行原操作
    arrProto[key].apply(this,args);

    let newVal;

    if(key == 'push' || key == 'unshift'){
      newVal = args;
    }else if(key == 'splice') {
      newVal = args.slice(2)
    }

    // 通知更新 
    this.__ob__.dep.notify();


    // 判断是否是插入操作 插入则对新插入的值 做响应式处理
    newVal && this.__ob__.observeArray(newVal)
  }
})

export default arrMethods;

```

### 编译器实现
创建 compile.js 
``` js
import Watcher from './watcher.js'
class Compiler {
  constructor(vm) {
    this.$vm = vm;
    this.compile(vm.$el);
  }
  // 编译元素节点
  compile(el) {
    const childrens = Array.from(el.childNodes);
    childrens.forEach(node => {
      /**
       * nodeType 常用节点类型：
       * 1 ELEMENT_NODE 元素节点
       * 3 TEXT_NODE   文本节点
       * 8 COMMENT_NODE 注释节点
       */
      if (node.nodeType == 3) { //是文本节点
        const exps = this.isInter(node);
        
        if (exps === null) return; // 没有需要替换的文本直接返回

        this.compileText(node, exps);

      } else if (node.nodeType == 1) { // 元素节点 需要判断是否有指令
        // 保存节点所有属性
        const attrs = node.attributes;
        // 遍历
        for (let attr of attrs) {

          if (this.isDir(attr.name)) { // 是否是指令
            
            this[RegExp.$1](node, attr.value); 

          }else if(this.isEvent(attr.name)){ // 是否是事件

            this.bindEvent(node,RegExp.$2,this.$vm[attr.value]);
          }
        }
        this.compile(node);
      }
    })
  }
  // 匹配所有的插值 即被{{}}包裹的字符
  isInter(node) {
    const reg = /\{\{([^\{\{\}\}]*)\}\}/g
    return node.nodeValue.match(reg);
  }
  // 是否是指令
  isDir(dir){
    return /^c-(.*)/.test(dir) && RegExp.$1 in this ;
  }
  isEvent(attr){
    return /(?<=(@|c-on:))(.+)/.test(attr)
  }
  // 替换文本
  /*
      实现mustach + - * / 执行函数语法等思路  
      1. new Function
        可以把表达式放到new Function里执行但是作用域始终指向window 所以除非把要用的属性挂载到window上不然不可行
      2. 借用with与eval
        with中指定this.$vm为当前上下文使用eval来执行表达式  但是class环境中使用不了eval
      设想：
      function test(){
        let result; 
        const exp = 'a+b/2'; // 可以实现一些复杂操作 
        with({a:10,b:20}){
          eval(`result=${exp}`)
        }
        console.log(result); // 20
      }
  */
  // 编译文本
  compileText(node, arr) {
    let textModel = node.nodeValue;
    for (let exp of arr) {
      const key = exp.replace(/{{|}}/g, '')
      this.updater(key, function () {
        node.nodeValue = textModel;
        for (let exp of arr) {
          const key = exp.replace(/{{|}}/g, '')
          node.nodeValue = node.nodeValue.replace(exp, this.$vm[key])
        }
      }.bind(this))
    }
  }
  // 指令
  html(node, key) {
    this.updater(key, this.htmlDirectiveFn.bind(this, node, key))

  }
  text(node, key) {
    this.updater(key, this.textDirectiveFn.bind(this, node, key))
  }
  model(node, key){
    // 使用input事件的3个input 类型

    const inputChangeType = ['text', 'password','number'];

    // 如果节点是输入框
    if(node.nodeName == 'INPUT') {

      const type = node.getAttribute('type');

      if(inputChangeType.includes(type)){

        // 同步初始值
        node.value = this.$vm[key];

        // 保存更新函数
        this.updater(key, this.modelDirectiveFn.bind(this, node, key))

        // 绑定input事件
        node.addEventListener('input',e =>{
          const val = e.target.value;
          this.$vm[key] = val;
        })
      }
    }
  }
  // 事件
  bindEvent(node,eventName,fn){
    node.addEventListener(eventName, e=>{
     fn.call(this.$vm,e);
    })
  }

  modelDirectiveFn(node,key){
    node.value = this.$vm[key];
  }
  textDirectiveFn(node, key) {
    node.innerText = this.$vm[key];
  }
  htmlDirectiveFn(node, key) {
    node.innerHTML = this.$vm[key];
  }
  // 所有的更新操作都在这执行 统一收集依赖
  updater(key, fn) {
    fn();
    new Watcher(this.$vm,key, fn)
  }
  // 后续实现 c-bind c-for c-if 等
}
export default Compiler;
```

- compile方法编译元素节点 并递归遍历子节点
- compileText方法解析带 `{{}}` 的文本
- updater 保存更新函数到Watcher  收集依赖 

### 实现Watcher监听器
```Js
import Dep from './dep.js'

let watcherId = 0; // 标识当前Watcher实例 用于在Dep中去重

class Watcher {
  constructor(vm,key,updateFn){
      this.key = key;

      this.id = watcherId++

      this.updateFn = updateFn;
      // 给Dep挂载一个静态属性 引用自身 之后通过读取一次 key(响应式数据) 后 Dep 能够收集到 当前Watcher
      /*
       在observer.js的 defineReactive中 为每一个响应式数据key 都生成了一个Dep 
       而在Object.defineProperty的getter中 每次获取都会判断一下 Dep是否有一个target静态属性
       所以我们在这里 先给 Dep加一个target 之后在读取一次 实例的这个key 就会触发getter 把当前watcher添加到Dep中的deps 
      */ 
      Dep.target = this;
      vm[this.key] // 读取触发了getter
      delete Dep.target // 收集完删除
  }
  update() {
    this.updateFn()
  }
}
export default Watcher
```
### 实现Dep依赖收集
```Js
class Dep {
  constructor(){
    this.deps = [];
  }
  addDep(){
    // 判断是否已有相同watcher 
    if(!this.deps.find(watcher=>watcher.id==Dep.target.id)){
      this.deps.push(Dep.target);
    }
  }
  // 通知更新
  notify() {
    // 执行所有watcher的更新函数
    this.deps.forEach(dep => dep.update())
  }
}
export default Dep;
```
