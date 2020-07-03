/**
 * @fileDesc 处理vue中的编译模板工作
 *  
 * */ 
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
    // 保留一份未解析的初始文本
    let textModel = node.nodeValue;

    // 循环替换当前节点中的 所有 {{}} 文本
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