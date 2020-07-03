import Observer from './observe.js'
import Compiler from './compile.js'
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
class CVue {
  constructor(options) {
    // 配置项放到实例下
    for(let key in options){
      this['$'+key] = options[key];
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
export default CVue;