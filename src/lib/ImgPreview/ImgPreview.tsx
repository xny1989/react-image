import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { MouseEvent as ReactMouseEvent, CSSProperties, PureComponent } from 'react'
// import { reaction } from 'mobx'
import LoadingIcon from '../LoadingIcon'
import ErrorIcon from '../ErrorIcon'
import Image from '../Image'
import { createObserver } from '../Image/observer'
import { setScrollbar, resetScrollbar } from '../../utils'
// import Store from './imgViewStore'
export type PreviewState = {
  x: number;
  y: number;
  left: number;
  top: number;
  scale: number;
  rotate: number;
  images: string[];
  current: number;
  open: boolean;
  changed: boolean;
  loaded: boolean;
  error: boolean;
}
export interface PreviewInterface {
  (current: number | string, list?: Array<string>): void
}

export interface PreviewInstance {
  preview: PreviewInterface
  show: () => void
  hide: () => void
  component: ImgPreview
  destroy: () => void
}
export interface PreviewInstanceCallback {
  (Instance: PreviewInstance): void
}

function find<T>(list: T[], arg: T): number {
  return list.findIndex(each => each === arg)
}
let observer: IntersectionObserver = null
export default class ImgPreview extends PureComponent<{}, PreviewState> {
  static newInstance: (callback: PreviewInstanceCallback) => void
  $el: HTMLElement = null
  $close: HTMLElement = null
  $footer: HTMLElement = null
  state: PreviewState = {
    // mouse position
    x: 0,
    y: 0,
    // img position
    left: 0,
    top: 0,
    // img transform
    scale: 1,
    rotate: 0,
    // origin state
    images: [],
    current: 0,
    open: false,
    changed: false,
    loaded: false,
    error: false
  }

  /**
   * container actions
   */

  /**
   * 设置当前图片
   * 如果图片是Number类型, 则直接设置current
   * 如果图片为对象, 则遍历images找出索引
   * 如果不存在图片, 则将图片作为images
   * @param {Number|Object}} current
   * @param {Array} list 图片数组
   */
  exportPreview: PreviewInterface = (current, list) => {
    let l = this.state.images
    let c: number | string = current
    if (list) {
      l = list
    }
    // 如果为number型则直接设置
    if (typeof c !== 'number') {
      // 否则调用find方法找下标
      // 如果不存在则设为images
      const idx = find<string>(l, c)
      if (idx === -1) {
        l = [c]
        c = 0
      } else {
        c = idx
      }
    }
    this.setState({
      current: c,
      images: l
    })
    this.show()
  }

  /**
   * window的按钮监听
   * 监听Esc按钮, 触发隐藏
   * @event
   * @memberof ImgPreview
   */
  windowKeyUpHandle = (e: KeyboardEvent) => {
    // e.stopPropagation()
    // e.preventDefault()
    const { keyCode } = e
    if (keyCode === 27) {
      this.hide()
    } else if (keyCode === 37) {
      this.prev()
    } else if (keyCode === 39) {
      this.next()
    }
  }

  /**
   * 隐藏图片浏览器
   * 只有在点击关闭按钮或者浏览器外的地方才触发
   * @event
   * @memberof ImgPreview
   */
  hideHandle = (e: React.MouseEvent) => {
    const { target } = e
    if (
      target === this.$close ||
      target === this.$el ||
      target === this.$footer
    ) {
      this.hide()
    }
  }

  addEffect() {
    setScrollbar()
    document.addEventListener('keyup', this.windowKeyUpHandle)
    // document.body.addEventListener('click', this.hideHandle)
    document.body.style.overflow = 'hidden'
  }

  removeEffect() {
    resetScrollbar()
    document.removeEventListener('keyup', this.windowKeyUpHandle)
    // document.body.removeEventListener('click', this.hideHandle)
    document.body.style.overflow = ''
  }

  /**
   * 打开图片浏览器
   * 绑定keyup与click事件监听关闭
   */
  show = () => {
    this.initImage()
    this.setState({
      open: true
    })
    this.addEffect()
  }

  /**
   * 隐藏图片浏览器
   * 卸载事件监听器
   */
  hide = () => {
    this.setState({
      open: false
    })
    this.removeEffect()
  }

  change = (current: number) => {
    this.initImage()
    this.setState({
      current
    })
  }

  next = () => {
    const { current, images } = this.state
    this.change((current + 1) % images.length)
  }

  prev = () => {
    const { current, images } = this.state
    this.change((current - 1 + images.length) % images.length)
  }
  /**
   * *******************************
   * Image actions
   * *******************************
   */

  /**
   * 初始化图片的position以及transform属性
   *
   * @memberof ImgPreview
   */
  initImage() {
    this.setState(
      {
        left: 0,
        top: 0,
        scale: 0,
        rotate: 0,
        changed: false,
        loaded: false
      },
      () => {
        this.setState({
          changed: true
        })
      }
    )
  }

  /**
   * 旋转事件
   * @param {number} arg 旋转的度数
   * @event
   */
  rotateFnc = (arg: number) => {
    const { rotate } = this.state
    this.setState({
      rotate: rotate + arg
    })
  }

  /**
   * 监听鼠标按下,触发绑定mousemove
   * @event
   */
  mouseDownHandle = (e: ReactMouseEvent<HTMLImageElement>) => {
    e.stopPropagation()
    if (e.button !== 0) {
      return
    }
    const container = this.$el
    this.setState({
      x: e.clientX,
      y: e.clientY
    })
    container.style.cursor = 'move'
    container.addEventListener('mousemove', this.mouseMoveHandle, false)
  }

  /**
   * 鼠标移动事件, 拖曳图片
   * @event
   */
  mouseMoveHandle = (e: MouseEvent) => {
    const x = e.clientX,
      y = e.clientY,
      offsetX = x - this.state.x,
      offsetY = y - this.state.y
    this.setState({
      x,
      y,
      left: this.state.left + offsetX,
      top: this.state.top + offsetY
    })
  }

  /**
   * 鼠标松开事件
   * 解除mousemove事件监听
   * @event
   */
  mouseUpHandle = () => {
    this.$el.removeEventListener('mousemove', this.mouseMoveHandle)
    this.$el.style.cursor = 'initial'
  }

  /**
   * 滚轮事件,图片放大缩小
   * @event
   */
  mouseWheelHandle = (e: React.WheelEvent<HTMLDivElement>) => {
    // 放大缩小功能
    // const delta = e.wheelDelta ? e.wheelDelta : -(e.detail || 0)
    let { scale } = this.state
    if (-e.deltaY < 0) {
      // 放大
      scale *= 1.1
    } else {
      // 缩小
      scale *= 0.9
    }
    this.setState({
      scale
    })
  }

  /**
   * 监听图片的onLoad事件
   * 设置初始的宽高
   *
   * @memberof ImgPreview
   */
  imgOnLoad = e => {
    const img = e.target as HTMLImageElement
    const width = img.naturalWidth
    let scale = 1
    const windwoWidth = (window.innerWidth * 3) / 4
    if (width > windwoWidth) {
      scale = windwoWidth / width
    }
    this.setState(
      {
        loaded: true,
        error: false
      },
      () => {
        setTimeout(() => {
          this.setState({
            scale
          })
        }, 25)
      }
    )
  }

  imgOnError = () => {
    this.setState({
      loaded: true,
      error: true
    })
  }

  get scaleFixed(): number {
    return +this.state.scale.toFixed(2)
  }

  /**
   * 图片样式
   * 设置宽高和左边
   *
   * @readonly
   * @memberof ImgPreview
   */
  get imgSty(): CSSProperties {
    const { rotate, top, left } = this.state
    const { scaleFixed } = this
    return {
      left: left + 'px',
      top: top + 'px',
      transform: `rotate(${rotate}deg) scale(${scaleFixed})`
    }
  }

  /**
   * @getter
   * 返回当前索引的图片
   *
   * @readonly
   */
  get currentImg(): string {
    const { current, images } = this.state
    return images[current]
  }

  get imgListStyle(): CSSProperties {
    return {
      display: 'flex',
      transform: `translate3d(-${this.state.current * 50}px, 0, 0)`,
      transition: 'transform .3s linear'
    }
  }

  componentDidMount() {
    if (!observer) {
      observer = createObserver(document.querySelector('.img-viewer-list'))
    }
  }

  _renderIcon() {
    return (
      <>
        <div
          className='img-viewer-close'
          ref={el => {
            this.$close = el
          }}
        >
          <i className='react-image-icon' style={{ pointerEvents: 'none' }}>
            &#xe904;
          </i>
        </div>
        <i className='img-viewer-prev react-image-icon' onClick={this.prev}>
          &#xe914;
        </i>
        <i className='img-viewer-next react-image-icon' onClick={this.next}>
          &#xe914;
        </i>
      </>
    )
  }

  _renderImg() {
    const {
      state,
      currentImg,
      mouseDownHandle,
      imgOnLoad,
      imgOnError,
      imgSty
    } = this
    return (
      <>
        <img
          className={[
            'img-viewer-current',
            state.loaded && !state.error ? '' : 'dis-none'
          ].join(' ')}
          onMouseDown={mouseDownHandle}
          onLoad={imgOnLoad}
          onError={imgOnError}
          src={state.changed ? currentImg : ''}
          alt=''
          draggable={false}
          style={imgSty}
        />
        {!state.loaded && (
          <div className='img-viewer-status'>
            <LoadingIcon />
          </div>
        )}
        {state.error && (
          <div className='img-viewer-status'>
            <ErrorIcon style={{ width: '300px', height: '300px' }} />
          </div>
        )}
      </>
    )
  }

  _renderFooter() {
    const { state, prev, next, rotateFnc } = this
    const { images, current } = state
    return (
      <>
        <div
          className='img-viewer-footer'
          ref={ref => {
            this.$footer = ref
          }}
        >
          <div className='img-viewer-ctrl'>
            <i
              className='react-image-icon'
              onClick={prev}
              style={{ transform: 'rotateY(180deg)' }}
            >
              &#xe914;
            </i>
            <i
              className='react-image-icon img-viewer-rotate'
              onClick={() => rotateFnc(90)}
            >
              &#xe91a;
            </i>
            <i
              className='react-image-icon img-viewer-rotate'
              onClick={() => rotateFnc(-90)}
              style={{ transform: 'rotateY(180deg)' }}
            >
              &#xe91a;
            </i>
            <i className='react-image-icon' onClick={next}>
              &#xe914;
            </i>
          </div>
          <div className='img-viewer-list'>
            <div className='img-viewer-list-inner'>
              <div style={this.imgListStyle}>
                {images.map((src, idx) => (
                  <div
                    onClick={() => this.change(idx)}
                    key={idx}
                    className={[
                      'img-viewer-list-item',
                      current === idx ? 'active' : ''
                    ].join(' ')}
                  >
                    <Image
                      observer={observer}
                      width='50'
                      height='50'
                      preview={false}
                      mask={false}
                      src={src}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  render() {
    const { state, mouseUpHandle, mouseWheelHandle } = this
    return (
      <div
        id='imgPreview'
        ref={el => {
          this.$el = el
        }}
        onClick={this.hideHandle}
        className='img-viewer-container'
        style={{ display: state.open ? 'flex' : 'none' }}
        onMouseUp={mouseUpHandle}
        onWheel={mouseWheelHandle}
        draggable={false}
      >
        {this._renderIcon()}

        {this._renderImg()}

        {this._renderFooter()}
      </div>
    )
  }
}

ImgPreview.newInstance = function newPreviewInstance(callback) {
  const div = document.createElement('div')
  function ref(ins: ImgPreview) {
    callback({
      preview(current, list) {
        ins.exportPreview(current, list)
      },
      show() {
        ins.show()
      },
      hide() {
        ins.hide()
      },
      component: ins,
      destroy() {
        ReactDOM.unmountComponentAtNode(div)
        div.parentNode.removeChild(div)
      }
    })
  }
  document.body.appendChild(div)
  ReactDOM.render(<ImgPreview ref={ref} />, div)
}
