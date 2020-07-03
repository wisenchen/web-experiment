/** 
 * @class Dep  一个响应式数据对应一个Dep  Dep中收集所有依赖于该数据的更新函数
 */
class Dep {
  constructor(){
    this.deps = [];
  }
  addDep(){
    if(!this.deps.find(watcher=>watcher.id==Dep.target.id)){
      this.deps.push(Dep.target);
    }
  }
  // 通知更新
  notify() {
    this.deps.forEach(dep => dep.update())
  }
}
export default Dep;