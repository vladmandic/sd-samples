const shuffle = false;
const dataMap = {};
const modelMap = {};


function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

async function fetchData(uri) {
  const response = await fetch(uri);
  const data = await response.json();
  return data;
}

function getModel(item) {
  let model = modelMap[item.title];
  if (!model) model = modelMap[item.shortName];
  if (!model) console.error('getModel', title, modelMap);
  return model;
}

async function filterGrid() {
  const filter = document.getElementById('filter').value.toLowerCase();
  const gridCells = document.querySelectorAll('.grid-cell');
  gridCells.forEach(cell => {
      const img = cell.querySelector('img');
      if (img) {
        const title = img.alt.toLowerCase();
        const style = img.title.toLowerCase();
        if (title.includes(filter) || style.includes(filter)) cell.style.visibility = '';
        else cell.style.visibility = 'hidden';
      }
  });
}

async function showDetails(item) {
    // const info = JSON.parse(item.info);
    const detailsContent = document.getElementById('details-content');
    const model = getModel(item);
    let modules = '';
    if (model) {
      modules = model.modules.sort((a, b) => b.params - a.params);
      modules = modules.map(m => `<div class="module" title="module size is in milion of parameters">${m.class}: ${Math.round(m.params/1024/1024).toLocaleString()} MP</div>`).join(' ');
    }
    detailsContent.innerHTML = `
      <img src="images/${encodeURIComponent(item.image)}" alt="${item.title}">
      <div class="container">
        <div class="column info-block">
          <p><strong>Model: </strong>${model?.repo}</p>
          <p><strong>Type: </strong>${model?.type} <strong>&nbsp Class: </strong> ${model?.class}</p>
          <p><strong>Size: </strong>${Math.round(model?.size / 1024 / 1024).toLocaleString()} MB</p>
          <p><strong>Load time: </strong>${model?.load.toFixed(1)} seconds</p>
          <p><strong>Modules: </strong>${modules}</p>
        </div>
        <div class="column info-block">
          <p><strong>Style: </strong>${item.style}</p>
          <p><strong>Prompt: </strong>${item.prompt}</p>
          <p><strong>Size: </strong>${item.size.join('x')}</p>
          <p><strong>Seed: </strong>${item.seed}</p>
          <p><strong>Steps: </strong>${item.steps}</p>
          <p><strong>Generate time: </strong>${item.time.toFixed(1)} seconds</p>
        </div>
      </div>
    `;
}

async function main() {
  const modelData = await fetchData('../models.json');
  const imageData = await fetchData('../images.json');

  // extract models and styles
  let uniqueTitles = [...new Set(imageData.map(item => item.title))];
  let uniqueStyles = [...new Set(imageData.map(item => item.style))];
  if (shuffle) {
    uniqueTitles = shuffleArray(uniqueTitles);
    uniqueStyles = shuffleArray(uniqueStyles);
  }

  // setup elements
  const gridContainer = document.getElementById('grid-container');
  const xAxisHeader = document.getElementById('x-axis-header');
  const yAxisHeader = document.getElementById('y-axis-header');
  gridContainer.style.gridTemplateColumns = `repeat(${uniqueTitles.length}, 150px)`;
  gridContainer.style.gridTemplateRows = `repeat(${uniqueStyles.length}, 150px)`;

  // create datamap for quick lookups
  imageData.forEach(item => {
    if (!dataMap[item.style]) dataMap[item.style] = {};
    dataMap[item.style][item.title] = item;
  });
  modelData.forEach(model => {
    model.shortName = model.repo.split('/').pop().replace('_diffusers', '').replace('-diffusers', '').replace(' Diffusers', '');
    modelMap[model.shortName] = model;
  });

  // create headers
  uniqueTitles.forEach(title => {
      const titleEl = document.createElement('div');
      titleEl.className = 'axis-title';
      titleEl.textContent = title.replace(/_/g, ' ').replace(/-/g, ' ');
      model = modelMap[title];
      if (model) titleEl.title = `${model.model} ${model.type} ${model.class}`;
      else console.error('model', title, modelMap)
      xAxisHeader.appendChild(titleEl);
  });
  uniqueStyles.forEach(style => {
      const styleEl = document.createElement('div');
      styleEl.className = 'axis-title';
      styleEl.textContent = style;
      yAxisHeader.appendChild(styleEl);
  });

  // populate grid
  uniqueStyles.forEach(style => {
      uniqueTitles.forEach(title => {
          const cell = document.createElement('div');
          cell.className = 'grid-cell';
          const itemData = dataMap[style] ? dataMap[style][title] : null; // lookup item
          if (itemData) {
              const img = document.createElement('img');
              img.loading = 'lazy';
              img.src = `thumbs/${encodeURIComponent(itemData.image)}`;
              img.alt = `${itemData.title} - ${itemData.style}`;
              model = modelMap[title];
              if (model) img.title = `${itemData.title} | ${model.model} | ${model.type} | ${model.class} | ${itemData.style}`;
          
              cell.appendChild(img);
              cell.addEventListener('mouseover', () => showDetails(itemData));
          } else {
              cell.classList.add('empty');
          }
          gridContainer.appendChild(cell);
      });
  });
  
  // map scrollbars
  gridContainer.addEventListener('scroll', () => {
      xAxisHeader.scrollLeft = gridContainer.scrollLeft;
      yAxisHeader.scrollTop = gridContainer.scrollTop;
  });

  // setup filter function
  const filter = document.getElementById('filter');
  filter.addEventListener('input', filterGrid);
}

document.addEventListener('DOMContentLoaded', main);
