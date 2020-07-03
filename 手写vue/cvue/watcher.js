import Dep from './dep.js'

let watcherId = 0; // 标识当前Watcher实例 用于在Dep中去重

class Watcher {
  constructor(vm,key,updateFn){
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
export default Watcher