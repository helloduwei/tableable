class tableResizable {
  constructor (id, options) {
    // 自动创建表格
    this.stepP = null   // 初始化promise
    this.stepResolve = null  // 初始化resolve
    this.minRow = 0  // 选中区域最小row行号
    this.minCol = 0  // 选中区域最小col列号
    this.selectRows = 0  // 选中区域的行数
    this.selectCols = 0  // 选中区域的列数
    this.dragElement = null  // 被拖动元素
    this.fontFamilies = ['Microsoft YaHei', '华文黑体', 'STSong', 'STKaiti']  // 字体列表，可自行修改
    this.minFontSize = 12  // 字号最小值，浏览器支持
    this.maxFontSize = 30  // 字号最大值，可自行指定
    this.selects = []  // 被选中的单元格数组
    this.init(id)  // 初始化方法

    this.store = {
      dragging: false,                 //是否拖动
      draggingColumn: null,            //拖动的对象
      miniWidth: 30,                   //拖动的最小宽度
      startMouseLeft: undefined,       //鼠标点击时的clientX
      startLeft: undefined,            //th右离table的距离
      startColumnLeft: undefined,      //th左离table的距离
      tableLeft: undefined,            //table离页面左边的距离,
      HColumns: [],
      BColumns: []
    };
  };

  _saveCols(header, body) {
    // cols
    this.store.HColumns = Array.from(header.querySelectorAll('col')).map(v => ({
      el: v,
      isChange: false,
    }));
    this.store.BColumns = Array.from(body.querySelectorAll('col')).map(v => ({
      el: v,
      isChange: false,
    }));
  };

  _resolveDom() {
    const [ THeader ] = this._tables;
    let TBody;
    const Tr = THeader.tHead.rows[0];
    const columns = Array.from(Tr.cells);
    const Bcolgroup = document.createElement('colgroup');
    const cols = columns.map((item, index) => {
      const col = document.createElement('col');
      item.dataset.index = index;
      col.width = +item.offsetWidth;
      return col;
    });
    cols.reduce((newDom, item) => {
      newDom.appendChild(item);
      return newDom;
    }, Bcolgroup);
    const HColgroup = Bcolgroup.cloneNode(true);

    //不管是一个table还是两个，都把header合body提出来
    if (this._tables.length === 1) {
      const [ , tbody ] = Array.from(THeader.children);
      tbody.remove();
      var HFirstChild = THeader.firstChild;
      THeader.insertBefore(HColgroup, HFirstChild);
      
      TBody = THeader.cloneNode();
      TBody.appendChild(Bcolgroup);
      TBody.appendChild(tbody);
      this._el.appendChild(TBody);
    } else {
      var HFirstChild = THeader.firstChild;
      THeader.insertBefore(HColgroup, HFirstChild);
      [ , TBody ] = this._tables;
      var BFirstChild = TBody.firstChild;
      TBody.insertBefore(Bcolgroup, BFirstChild);
    }

    //拖动时的占位线
    const hold = document.createElement('div');
    hold.style = 'position: absolute; left: 200px; top: 0; bottom: 0; width: 0; border-left: 1px solid rgb(223, 230, 236); z-index: 10; display: none;'
    this._el.appendChild(hold);

    // 把cols缓存起来
    this._saveCols(THeader, TBody);

    //处理事件
    Tr.addEventListener('mousemove', this.handleMouseMove.bind(this));
    Tr.addEventListener('mouseout', this.handleMouseOut.bind(this));

    //处理拖动
    const handleMouseDown = (evt) => {
      if (this.store.draggingColumn) {
        this.store.dragging = true;

        let { target } = evt;
        while (target && target.tagName !== 'TH') {
          target = target.parentNode;
        }

        if (!target) return;

        const tableEle = THeader;
        const tableLeft = tableEle.getBoundingClientRect().left;
        const columnRect = target.getBoundingClientRect();
        const minLeft = columnRect.left - tableLeft + this.store.miniWidth;
        target.classList.add('noclick');

        this.store.startMouseLeft = evt.clientX;
        this.store.startLeft = columnRect.right - tableLeft;
        this.store.startColumnLeft = columnRect.left - tableLeft;
        this.store.tableLeft = tableLeft;

        document.onselectstart = () => false;
        document.ondragstart = () => false;

        // hold.style.display = 'block';
        hold.style.left = this.store.startLeft + 'px';

        const handleOnMouseMove = (event) => {
          const deltaLeft = event.clientX - this.store.startMouseLeft;
          const proxyLeft = this.store.startLeft + deltaLeft;

          hold.style.left = Math.max(minLeft, proxyLeft) + 'px';
        };

        // 宽度是这样分配的，举个🌰，如果a,b,c,d，他们每个都有个changed状态，默认false，拖过a,a.changed改为true，改变的宽度就由剩下的b,c,d平摊，如果都改变了，就让最后一个元素d背锅
        const handleOnMouseUp = (event) => {
          if (this.store.dragging) {
            const { startColumnLeft } = this.store;
            const finalLeft = parseInt(hold.style.left, 10);
            const columnWidth = finalLeft - startColumnLeft;
            const index = +target.dataset.index;
            HColgroup.children[index].width = columnWidth;
            if (index !== this.store.HColumns.length - 1) {
              this.store.HColumns[index].isChange = true;
            }
            const deltaLeft = event.clientX - this.store.startMouseLeft;
            const changeColumns = this.store.HColumns.filter((v, i) => i > index && !v.isChange && +v.el.width > 30);
            changeColumns.forEach(item => {
              item.el.width = +item.el.width - deltaLeft / changeColumns.length;
            });
            
            this.store.BColumns.forEach((item, i) => {
              item.el.width = this.store.HColumns[i].el.width;
            });

            hold.style.display = 'none';

            document.body.style.cursor = '';
            this.store.dragging = false;
            this.store.draggingColumn = null;
            this.store.startMouseLeft = undefined;
            this.store.startLeft = undefined;
            this.store.startColumnLeft = undefined;
            this.store.tableLeft = undefined;
          }

          document.removeEventListener('mousemove', handleOnMouseMove);
          document.removeEventListener('mouseup', handleOnMouseUp);
          document.onselectstart = null;
          document.ondragstart = null;

          setTimeout(() => {
            target.classList.remove('noclick');
          }, 0);
        };

        document.addEventListener('mouseup', handleOnMouseUp);
        document.addEventListener('mousemove', handleOnMouseMove);
      }
    };
    Tr.addEventListener('mousedown', handleMouseDown);
  };

  handleMouseMove(evt) {
    let { target } = evt;
    while (target && target.tagName !== 'TH') {
      target = target.parentNode;
    }

    if (!target) return;

    if (!this.store.dragging) {
      const rect = target.getBoundingClientRect();
      const bodyStyle = document.body.style;
      if (rect.width > 12 && rect.right - evt.pageX < 8) {
        bodyStyle.cursor = 'col-resize';
        target.style.cursor = 'col-resize';
        this.store.draggingColumn = target;
      } else {
        bodyStyle.cursor = '';
        target.style.cursor = 'pointer';
        this.store.draggingColumn = null;
      }
    }
  };

  handleMouseOut() {
    document.body.style.cursor = '';
  }

  generateHtml(cols, rows) {
    // 创建表格方法
    const width = 900/cols
    const g1 = document.querySelector('#g1')
    const g2 = document.querySelector('#g2')
    const th = document.querySelector('#headGroup')
    const tbody = document.querySelector('#bodys')
    const col = `<col width="${width}">`
    let colHtml = ''
    let thHtml = ''
    let rowHtml = ''
    let bodyHtml = ''
    for (let i = 0; i< cols; i++) {
      colHtml += col
      rowHtml += `<td style="word-break: break-all; text-align: left;height:40px; min-height: 40px; border: 1px solid #ddd;" data-col=${i+1}></td>`
      thHtml += `<th style="border: 1px solid #ddd;" data-index=${i+1}>${i+1}</th>`
    }
    g1.innerHTML = g2.innerHTML = colHtml
    th.innerHTML = thHtml
    for (let j = 0;j < rows; j++) {
      bodyHtml += `<tr style="min-height: 40px" data-row=${j+1}>${rowHtml}</tr>`
    }
    tbody.innerHTML = bodyHtml
    this.addEvents()
    this.stepResolve()
  }

  clearAllSelected(tds) {
    // 将所有单元格的选中状态取消
    tds.forEach((td) => {
      td.style.backgroundColor = ''
      td.removeAttribute('class')
    })
  }

  addEvents() {
    // 为生成的单元格增加单击选中方法、双击编辑方法、拖放方法
    const tds = document.querySelectorAll('td')
    tds.forEach((td) => {
      td.addEventListener('click', () => {
        if (!td.style.backgroundColor) {
          td.style.backgroundColor = '#ddd'
          td.setAttribute('class', 'selected')
          this.checkFont(td.style.fontFamily, td.style.fontSize)
        } else {
          td.style.backgroundColor = ''
          td.removeAttribute('class')
        }
        this.getAllSelects()
      })
      td.addEventListener('dblclick', () => {
        const ipt = document.createElement('input')
        ipt.style="border: none; outline: none; background-color: transparent;font-size: inherit; font-family: inherit;width: 100%;"
        if (td.innerHTML) {
          ipt.value = td.innerHTML
          td.innerHTML = ''
        }
        td.appendChild(ipt)
        ipt.focus()
        ipt.addEventListener('blur', () => {
          td.innerHTML = ipt.value
          this.clearAllSelected(tds)
        })
      })
      td.addEventListener('dragover', (e) => {
        e.preventDefault()
      })
      td.addEventListener('drop', () => {
        if (this.dragElement) {
          td.innerHTML = this.dragElement.dataset.role
        }
      })
    })
  }

  checkFont(family, size) {
    // 当前单元格显示字体和字号
    const fmls = document.querySelectorAll('.fml')
    const szs = document.querySelectorAll('.sz')
    fmls.forEach((fml) => {
      if (fml.value === family) {
        fml.selected = true
      } else {
        fml.selected = false
      }
    })
    szs.forEach((sz) => {
      if (sz.value === size) {
        sz.selected = true
      } else {
        sz.selected = false
      }
    })
  }

  combineCells() {
    // 合并单元格方法入口
    const selectedTDs = document.querySelectorAll('.selected')
    const selectedItem = []
    let isRect = false
    let combined = false
    if (!selectedTDs || selectedTDs.length < 1) {
      alert('请选择合适的单元格')
      return
    }
    selectedTDs.forEach((td) => {
      if (td.getAttribute('colspan') || td.getAttribute('rowspan')) {
        combined = true
      }

      selectedItem.push({row: +td.parentNode.dataset.row, col: +td.dataset.col})
    })
    isRect = this.isRect(selectedItem)
    
    if (combined) {
      alert('请不需要选择合并过的单元格')
      return
    }

    if (!isRect) {
      alert('请选择合适的单元格')
      return
    }

    this.doCombine(selectedTDs)
  }

  doCombine(tds) {
    // 将被选中单元格中最小的设置跨行跨列，其余删除，实现合并单元格
    tds.forEach((item) => {
      if (item.parentNode.dataset.row - 0 === this.minRow && item.dataset.col - 0 === this.minCol) {
        item.setAttribute('colspan', this.selectCols)
        item.setAttribute('rowspan', this.selectRows)
      } else {
        item.parentNode.removeChild(item)
      }
    })
    this.clearAllSelected(tds)
  }

  isRect(arr) {
    // 判断所选区域是否矩形
    let flag = false
    if (this.isContinuous(arr) && this.isNxN(arr)) {
      flag = true
    }

    return flag
  }

  isNxN(arr) {
    // 总数是否是n x n
    let isNxN = false
    const rows = []
    const cols = []
    arr.forEach((item) => {
      rows.push(item.row)
      cols.push(item.col)
    })
    const x = [...new Set(cols)].length
    const y = [...new Set(rows)].length
    this.selectCols = x
    this.selectRows = y
    if (x * y === arr.length && arr.length !== 1) {
      isNxN = true
    }

    return isNxN
  }

  isContinuous(arr) {
    // 行、列是否是连续的
    let continuous = true
    arr.sort((x, y) => {
      return x.row - y.row
    })
    this.minRow = arr[0].row
    arr.forEach((item, index) => {
      if (arr[index-1] && (item.row - arr[index-1].row > 1) ) {
        continuous = false
      }
    })
    arr.sort((x, y) => {
      return x.col - y.col
    })
    this.minCol = arr[0].col
    arr.forEach((item, index) => {
      if (arr[index-1] && (item.col - arr[index-1].col > 1 )) {
        continuous = false
      }
    })

    return continuous
  }

  createTable() {
    // 创建表格功能
    const createBtn = document.querySelector('#create')
    const combineBtn = document.querySelector('#combine')
    combineBtn.addEventListener('click', () => {
      this.combineCells()
    })
    createBtn.addEventListener('click', () => {
      const colNum = document.querySelector('#cols').value - 0
      const rowNum = document.querySelector('#rows').value - 0
      this.generateHtml(colNum, rowNum)
    })
    this.stepP = this.stepP ||  new Promise((resolve) => {
      this.stepResolve = resolve
    })
    return this.stepP
  }

  generateDraggableElement() {
    // 为可拖动控件增加拖动事件
    const elements = document.querySelectorAll('.draggableElement')
    elements.forEach((item) => {
      item.addEventListener('dragstart', (e) => {
        this.dragElement = e.target
      })
      item.addEventListener('dragend', () => {
        this.dragElement = null
      })
    })
  }

  generateFonts() {
    // 生成字体、字号选项
    const fontFamily = document.querySelector('#fontFamily')
    const fontSize = document.querySelector('#fontSize')
    const size = this.maxFontSize - this.minFontSize
    let familyOptions = ''
    let sizeOptions = ''
    this.fontFamilies.forEach((item) => {
      familyOptions += `<option class="fml" value="${item}">${item}</option>`
    })
    for (let index = 0; index <= size; index++) {
      sizeOptions += `<option class='sz' value="${this.minFontSize + index}px">${this.minFontSize + index}px</option>`
    }
    fontFamily.innerHTML = familyOptions
    fontSize.innerHTML = sizeOptions
    // 为字体、字号框添加事件
    fontFamily.addEventListener('change', () => {
      this.selects.forEach((item) => {
        item.style.fontFamily = fontFamily.value
      })
    })
    fontSize.addEventListener('change', () => {
      this.selects.forEach((item) => {
        item.style.fontSize = fontSize.value
      })
    })
  }

  getAllSelects() {
    // 获取所有被选中的单元格
    const selects = document.querySelectorAll('.selected')
    this.selects = selects
  }

  init(id) {
    this.generateDraggableElement()
    this.generateFonts()
    this.createTable().then(() => {
      this._el = document.querySelector(`#${id}`);
      this._tables = Array.from(this._el.querySelectorAll('table'));
      setTimeout(() => this._resolveDom());
    })
  }
}

const table = new tableResizable('tableable');