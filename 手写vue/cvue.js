/**
 *
 * @param {*} vm 即需要通过vm可直接返回数据
 * @param {*} sourceKey 原key名
 */
function proxy(vm, sourceKey) {
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

const arrApi = ['push','pop','shift','unshift','splice','reverse','sort']; // 现具有修改原数组能力的几个数组方法

const arrProto = Array.prototype;  // 由于只覆盖几个方法但是其余方法保留 所以不能直接覆盖 Array.prototype 需要先做个备份

const arrMethods = Object.create(arrProto); // 相当于在Array.prototype前加一层 arrMethods 所以如果访问arrMethods不存在的方法 还是会到数组原型上找


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


class CVue {
  constructor(options) {
    // 配置项放到实例下
    for (let key in options) {
      this['$' + key] = options[key];
    }
    //  获取根节点
    this.$el = document.querySelector(this.$el);

    // 对data进行一层代理 可以通过 this.counter 直接访问
    proxy(this, '$data')

    // 监听data的数据变化
    new Observer(options.data);

    // 编译
    new Compiler(this)
  }
}

class Observer {
  constructor(value) {
    this.value = value
    this.dep = new Dep()
    // value.__ob__ = this;
    this.observe(value);
  }
  observe(obj) {
    if (typeof obj !== 'object') {
      return;
    }
    if (Array.isArray(obj)) { // 如果是一个数组
      //  覆盖原型
      obj.__proto__ = arrMethods;
      this.observeArray(obj)
    } else {
      this.walk(obj)
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
      if (keys[i] == '__ob__') continue;
      this.defineReactive(obj, keys[i], obj[keys[i]])
    }
  }

  defineReactive(obj, key, val) {
    this.observe(val);
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


class Compiler {
  constructor(vm) {
    this.$vm = vm;
    window.counter = 1;
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
        const attrs = node.attributes;
        for (let attr of attrs) {
          if (this.isDir(attr.name)) { // 是否是指令
            this[attr.name](node, attr.value);
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
  isDir(dir) {
    return (dir.startsWith('c-') || dir.startsWith('@')) && dir in this;
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
    // 这里怎么才能做到只替换有变化的key
    let textModel = node.nodeValue;
    for (let exp of arr) {
      const key = exp.replace(/{{|}}/g, '')
      this.update(key, function () {
        node.nodeValue = textModel;
        // node.nodeValue = node.nodeValue.replace(exp,this.$vm[key])
        for (let exp of arr) {
          const key = exp.replace(/{{|}}/g, '')
          node.nodeValue = node.nodeValue.replace(exp, this.$vm[key])
        }
      }.bind(this))
    }
  }


  "c-html"(node, key) {
    this.update(key, this.htmlDirectiveFn.bind(this, node, key))

  }
  "c-text"(node, key) {
    this.update(key, this.textDirectiveFn.bind(this, node, key))
  }
  "c-model"(node, key) {
    const inputChangeType = ['text', 'password', 'number']
    if (node.nodeName == 'INPUT') {
      const type = node.getAttribute('type');
      if (inputChangeType.includes(type)) {
        node.value = this.$vm[key];
        this.update(key, this.modelDirectiveFn.bind(this, node, key))
        node.addEventListener('input', (e) => {
          const val = e.target.value;
          this.$vm[key] = val;
        })
      }
    }
  }
  "c-on:click"(node, key) {
    node.addEventListener('click', (e) => {
      if (typeof this.$vm[key] == 'function') {
        this.$vm[key](e)
      }
    })
  }
  "@click"(node, key) {
    this["c-on:click"](node, key);
  }
  modelDirectiveFn(node, key) {
    node.value = this.$vm[key];
  }
  textDirectiveFn(node, key) {
    node.innerText = this.$vm[key];
  }
  htmlDirectiveFn(node, key) {
    node.innerHTML = this.$vm[key];
  }
  // 所有的更新操作都在这执行 统一收集依赖
  update(key, fn) {
    fn();
    new Watcher(this.$vm, key, fn)
  }
  // 后续实现 c-bind c-for c-if 等
}

class Dep {
  constructor() {
    this.deps = [];
  }
  addDep() {
    if (!this.deps.find(watcher => watcher.id == Dep.target.id)) {
      this.deps.push(Dep.target);
    }
  }
  // 通知更新
  notify() {
    this.deps.forEach(dep => dep.update())
  }
}

let watcherId = 0; // 标识当前Watcher实例 用于在Dep中去重

class Watcher {
  constructor(vm, key, updateFn) {
    this.key = key;

    this.id = watcherId++

    this.updateFn = updateFn;
    // 给Dep挂载一个静态属性 引用自身 之后通过读取一次 key(响应式数据) 后 Dep 能够收集到 当前Watcher
    Dep.target = this;
    vm[this.key] // 读取触发了getter
    delete Dep.target // 收集完删除
  }
  update() {
    this.updateFn()
  }
}