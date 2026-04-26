const TYPES = {
  0:  { name: 'Empty',           color: '#111'         },
  1:  { name: 'Wall',            color: '#7a4b2a'      },
  2:  { name: 'Disappear',       color: '#2a7fff'      },
  3:  { name: 'Explode',         color: '#ff3b30'      },
  4:  { name: 'Trampoline',      color: '#2ecc71'      },
  5:  { name: 'Push_Vertical',   color: '#a855f7'      },
  6:  { name: 'Push_Horizontal', color: '#c084fc'      },
  7:  { name: 'Move_Vertical',   color: '#e67e22'      },
  8:  { name: 'Move_Down',       color: '#e74c3c'      },
  9:  { name: 'Start',           color: '#00ff00'      },
  10: { name: 'Finish',          color: '#ffd700'      }
};

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const wInput = document.getElementById('w');
const hInput = document.getElementById('h');
const cellInput = document.getElementById('cell');
const jsonArea = document.getElementById('jsonArea');
const paletteEl = document.getElementById('palette');
const levelsEl = document.getElementById('levels');
const fileInput = document.getElementById('fileInput');
const currentFileNameSpan = document.getElementById('currentFileName');

let gridW = 20, gridH = 100, cellSize = 32, drawing = false, activeType = 1, isEraser = false;
let levels = [makeLevel('Level 1', 20, 100)], currentLevelIndex = 0;
let currentFileHandle = null;

function makeGrid(w, h) {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => 0));
}
function makeLevel(name, w, h) {
  return { name, width: w, height: h, offsetY: 0, grid: makeGrid(w, h) };
}
function cur() {
  return levels[currentLevelIndex];
}
function syncCurrentDims() {
  gridW = cur().width || cur().grid[0].length;
  gridH = cur().height || cur().grid.length;
  
  // Обновляем размеры в уровне если их нет
  if (!cur().width) cur().width = gridW;
  if (!cur().height) cur().height = gridH;
}
function resizeCanvas() {
  canvas.width = gridW * cellSize;
  canvas.height = gridH * cellSize;
}
function render() {
  syncCurrentDims();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      const t = cur().grid[y]?.[x] || 0;
      ctx.fillStyle = TYPES[t]?.color || '#111';
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
      
      // Рисуем метки для специальных стен
        if (t === 5) { // Двигает персонажа ↕
        ctx.fillStyle = '#fff';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('⇅', x * cellSize + cellSize/2, y * cellSize + cellSize/2 + 7);
        } else if (t === 6) { // Двигает персонажа ↔
        ctx.fillStyle = '#fff';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('⇄', x * cellSize + cellSize/2, y * cellSize + cellSize/2 + 7);
        } else if (t === 7) { // Движется ↕
        ctx.fillStyle = '#000';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('↕', x * cellSize + cellSize/2, y * cellSize + cellSize/2 + 7);
        } else if (t === 8) { // Движется ↓
        ctx.fillStyle = '#000';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('↓', x * cellSize + cellSize/2, y * cellSize + cellSize/2 + 7);
        } else if (t === 9) { // Старт
        ctx.fillStyle = '#000';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('S', x * cellSize + cellSize/2, y * cellSize + cellSize/2 + 7);
        } else if (t === 10) { // Финиш
        ctx.fillStyle = '#000';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('F', x * cellSize + cellSize/2, y * cellSize + cellSize/2 + 7);
        }
    }
  }
}
function getCellFromMouse(e) {
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width;
  const sy = canvas.height / rect.height;
  return {
    x: Math.floor((e.clientX - rect.left) * sx / cellSize),
    y: Math.floor((e.clientY - rect.top) * sy / cellSize)
  };
}
function paintCell(e) {
  const p = getCellFromMouse(e);
  if (p.x < 0 || p.y < 0 || p.x >= gridW || p.y >= gridH) return;
  
  // Убедимся что строка существует
  if (!cur().grid[p.y]) {
    cur().grid[p.y] = Array.from({ length: gridW }, () => 0);
  }
  
  if (isEraser) {
    cur().grid[p.y][p.x] = 0;
  } else {
    cur().grid[p.y][p.x] = activeType;
  }
  render();
  updateJsonArea();
}
function deleteLevel(index) {
  if (levels.length <= 1) {
    alert('Нельзя удалить последний уровень!');
    return;
  }
  
  const levelName = levels[index].name;
  if (!confirm(`Вы уверены, что хотите удалить уровень "${levelName}"?`)) {
    return;
  }
  
  levels.splice(index, 1);
  
  if (currentLevelIndex >= levels.length) {
    currentLevelIndex = levels.length - 1;
  } else if (currentLevelIndex > index) {
    currentLevelIndex--;
  }
  
  setLevel(currentLevelIndex);
  alert(`Уровень "${levelName}" удалён`);
}
function setLevel(i) {
  currentLevelIndex = i;
  syncCurrentDims();
  wInput.value = gridW;
  hInput.value = gridH;
  resizeCanvas();
  render();
  renderLevelButtons();
  renderPalette();
  updateJsonArea();
}
function renderPalette() {
  paletteEl.innerHTML = '';
  
  addSwatch(1, TYPES[1].color, 'Обычная стена');
  addSwatch(2, TYPES[2].color, 'Исчезающая стена');
  addSwatch(4, TYPES[4].color, 'Батут (рикошет)');
  addSwatch(5, TYPES[5].color, 'Двигает персонажа ↕');
  addSwatch(6, TYPES[6].color, 'Двигает персонажа ↔');
  addSwatch(7, TYPES[7].color, 'Движется ↕');
  addSwatch(8, TYPES[8].color, 'Движется ↓');
  addSwatch(9, TYPES[9].color, 'Старт');
  addSwatch(10, TYPES[10].color, 'Финиш');
  
  const eraser = document.createElement('button');
  eraser.className = 'swatch eraseBtn' + (isEraser ? ' active' : '');
  eraser.textContent = '🧹';
  eraser.title = 'Ластик';
  eraser.style.background = '#666';
  eraser.addEventListener('click', () => {
    isEraser = !isEraser;
    activeType = 1;
    canvas.classList.toggle('erase', isEraser);
    renderPalette();
  });
  paletteEl.appendChild(eraser);
}

function addSwatch(id, color, title) {
  const s = document.createElement('div');
  s.className = 'swatch' + (id === activeType ? ' active' : '');
  s.style.background = color;
  s.title = title;
  s.textContent = id;
  s.addEventListener('click', () => {
    activeType = id;
    isEraser = false;
    canvas.classList.remove('erase');
    renderPalette();
  });
  paletteEl.appendChild(s);
}

function renderLevelButtons() {
  levelsEl.innerHTML = '';
  levels.forEach((lvl, i) => {
    const container = document.createElement('div');
    container.style.display = 'inline-flex';
    container.style.gap = '2px';
    container.style.alignItems = 'center';
    
    const b = document.createElement('button');
    const w = lvl.width || lvl.grid[0].length;
    const h = lvl.height || lvl.grid.length;
    b.textContent = `${lvl.name} (${w}×${h})`;
    b.className = 'levelBtn' + (i === currentLevelIndex ? ' active' : '');
    b.addEventListener('click', () => setLevel(i));
    b.style.borderTopRightRadius = '0';
    b.style.borderBottomRightRadius = '0';
    
    const delBtn = document.createElement('button');
    delBtn.textContent = '×';
    delBtn.className = 'levelBtn';
    delBtn.title = 'Удалить уровень';
    delBtn.style.padding = '6px 10px';
    delBtn.style.borderTopLeftRadius = '0';
    delBtn.style.borderBottomLeftRadius = '0';
    delBtn.style.backgroundColor = '#8b0000';
    delBtn.style.color = '#fff';
    delBtn.style.border = '1px solid #ff4444';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteLevel(i);
    });
    
    container.appendChild(b);
    container.appendChild(delBtn);
    levelsEl.appendChild(container);
  });
  
  const add = document.createElement('button');
  add.textContent = '+ Добавить уровень';
  add.addEventListener('click', () => {
    const w = parseInt(wInput.value, 10) || 20;
    const h = parseInt(hInput.value, 10) || 100;
    levels.push(makeLevel('Level ' + (levels.length + 1), w, h));
    setLevel(levels.length - 1);
  });
  levelsEl.appendChild(add);
}

function formatGrid(grid) {
  return grid.map(row => {
    const rowStr = JSON.stringify(row);
    return '        ' + rowStr;
  }).join(',\n');
}

function exportData() {
  const levelsData = levels.map(l => ({
    name: l.name,
    width: l.width || l.grid[0].length,
    height: l.height || l.grid.length,
    offsetY: l.offsetY || 0,
    grid: l.grid
  }));
  
  let json = '{\n  "levels": [\n';
  levelsData.forEach((level, index) => {
    json += '    {\n';
    json += '      "name": ' + JSON.stringify(level.name) + ',\n';
    json += '      "width": ' + level.width + ',\n';
    json += '      "height": ' + level.height + ',\n';
    json += '      "offsetY": ' + level.offsetY + ',\n';
    json += '      "grid": [\n';
    json += formatGrid(level.grid);
    json += '\n      ]\n';
    json += '    }';
    if (index < levelsData.length - 1) json += ',';
    json += '\n';
  });
  json += '  ]\n}';
  return json;
}

function updateJsonArea() {
  jsonArea.value = exportData();
}

function importData(data) {
  if (!data.levels || !Array.isArray(data.levels) || !data.levels.length)
    throw new Error('Неверный формат: отсутствует массив levels');
  
  levels = data.levels.map((l, idx) => {
    if (!l.grid || !Array.isArray(l.grid) || !l.grid.length)
      throw new Error('Неверный формат: отсутствует grid в уровне ' + (idx + 1));
    if (!l.grid[0] || !Array.isArray(l.grid[0]))
      throw new Error('Неверный формат: grid должен быть двумерным массивом');
    
    return {
      name: l.name || ('Level ' + (idx + 1)),
      width: l.width || l.grid[0].length,
      height: l.height || l.grid.length,
      offsetY: l.offsetY || 0,
      grid: l.grid
    };
  });
  setLevel(0);
}

canvas.addEventListener('mousedown', e => {
  e.preventDefault();
  drawing = true;
  paintCell(e);
});
canvas.addEventListener('mousemove', e => {
  if (drawing) paintCell(e);
});
window.addEventListener('mouseup', () => drawing = false);
canvas.addEventListener('contextmenu', e => {
  e.preventDefault();
});

// Обработчик изменения размера для текущего уровня
document.getElementById('resizeBtn').addEventListener('click', () => {
  const newW = parseInt(wInput.value, 10);
  const newH = parseInt(hInput.value, 10);
  cellSize = parseInt(cellInput.value, 10);
  
  // Сохраняем старый грид
  const oldGrid = cur().grid;
  const oldW = cur().width || oldGrid[0].length;
  const oldH = cur().height || oldGrid.length;
  
  // Создаем новый грид
  const newGrid = makeGrid(newW, newH);
  
  // Копируем данные из старого грида в новый
  for (let y = 0; y < Math.min(oldH, newH); y++) {
    for (let x = 0; x < Math.min(oldW, newW); x++) {
      if (y < oldGrid.length && x < oldGrid[y].length) {
        newGrid[y][x] = oldGrid[y][x];
      }
    }
  }
  
  cur().grid = newGrid;
  cur().width = newW;
  cur().height = newH;
  gridW = newW;
  gridH = newH;
  
  resizeCanvas();
  render();
  updateJsonArea();
  renderLevelButtons();
});

document.getElementById('clearBtn').addEventListener('click', () => {
  cur().grid = makeGrid(gridW, gridH);
  render();
  updateJsonArea();
});

document.getElementById('exportJsonBtn').addEventListener('click', () => {
  updateJsonArea();
  alert('JSON обновлён в текстовом поле!');
});

document.getElementById('importJsonBtn').addEventListener('click', () => {
  try {
    const data = JSON.parse(jsonArea.value);
    importData(data);
    updateJsonArea();
    alert('JSON успешно импортирован!');
  } catch (err) {
    alert('Ошибка JSON: ' + err.message);
  }
});

document.getElementById('saveFileBtn').addEventListener('click', async () => {
  try {
    if ('showSaveFilePicker' in window) {
      const handle = await window.showSaveFilePicker({
        suggestedName: currentFileHandle?.name || 'levels.json',
        types: [{
          description: 'JSON Files',
          accept: { 'application/json': ['.json'] }
        }]
      });
      const writable = await handle.createWritable();
      await writable.write(exportData());
      await writable.close();
      currentFileHandle = handle;
      currentFileNameSpan.textContent = 'Текущий файл: ' + handle.name;
      alert('Файл сохранён: ' + handle.name);
    } else {
      const blob = new Blob([exportData()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'levels.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert('Файл сохранён как levels.json');
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      alert('Ошибка сохранения: ' + err.message);
    }
  }
});

document.getElementById('loadFileBtn').addEventListener('click', async () => {
  try {
    if ('showOpenFilePicker' in window) {
      const [handle] = await window.showOpenFilePicker({
        types: [{
          description: 'JSON Files',
          accept: { 'application/json': ['.json'] }
        }]
      });
      const file = await handle.getFile();
      const text = await file.text();
      const data = JSON.parse(text);
      importData(data);
      updateJsonArea();
      currentFileHandle = handle;
      currentFileNameSpan.textContent = 'Текущий файл: ' + handle.name;
      alert('Файл загружен: ' + handle.name);
    } else {
      fileInput.click();
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      alert('Ошибка загрузки: ' + err.message);
    }
  }
});

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        importData(data);
        updateJsonArea();
        currentFileNameSpan.textContent = 'Текущий файл: ' + file.name;
        alert('Файл загружен: ' + file.name);
      } catch (err) {
        alert('Ошибка файла JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  }
  fileInput.value = '';
});

document.addEventListener('keydown', async (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    if (currentFileHandle && 'createWritable' in currentFileHandle) {
      try {
        const writable = await currentFileHandle.createWritable();
        await writable.write(exportData());
        await writable.close();
        alert('Сохранено в текущий файл: ' + currentFileHandle.name);
      } catch (err) {
        alert('Ошибка сохранения: ' + err.message);
      }
    } else {
      document.getElementById('saveFileBtn').click();
    }
  }
});

wInput.addEventListener('change', updateJsonArea);
hInput.addEventListener('change', updateJsonArea);

renderPalette();
renderLevelButtons();
resizeCanvas();
render();
updateJsonArea();