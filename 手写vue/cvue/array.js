/**
 * @fileDesc 数组响应式处理 用以覆盖需要响应式的数组原型
 */ 


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

export default arrMethods;