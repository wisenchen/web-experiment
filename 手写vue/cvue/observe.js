import Dep from './dep.js'
import arrMethods from './array.js'
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
      //  覆盖原型
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
export default Observer;
