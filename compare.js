const shuffle = true;

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

async function fetchData() {
  const response = await fetch('images/history.json');
  const data = await response.json();
  console.log('images', data.length);
  return data;
}

async function showDetails(item) {
    const info = JSON.parse(item.info);
    const detailsContent = document.getElementById('details-content');
    detailsContent.innerHTML = `
        <img src="${encodeURIComponent(item.image)}" alt="${item.title}">
        <div class="info-block">
            <p><strong>Model:</strong> ${item.title}</p>
            <p><strong>Time:</strong> ${item.time.toFixed(3)} seconds</p>
            <p><strong>Prompt:</strong> ${info.prompt}</p>
            <p><strong>Size:</strong> ${item.size.join('x')}</p>
            <p><strong>Seed:</strong> ${info.seed}</p>
        </div>
    `;
}


async function main() {
  res = await fetch('images/history.json');
  const imageData = await fetchData();
  imageData.forEach(item => item.image = `images/${item.image.split('/').pop()}`);
  imageData.forEach(item => item.style = item.style.replace('Fixed ', ''));

  // extract models and styles
  let uniqueTitles = [...new Set(imageData.map(item => item.title))];
  let uniqueStyles = [...new Set(imageData.map(item => item.style))];
  if (shuffle) {
    uniqueTitles = shuffleArray(uniqueTitles);
    uniqueStyles = shuffleArray(uniqueStyles);
  }
  console.log('models', uniqueTitles.length)
  console.log('styles', uniqueStyles.length);

  // setup elements
  const gridContainer = document.getElementById('grid-container');
  const xAxisHeader = document.getElementById('x-axis-header');
  const yAxisHeader = document.getElementById('y-axis-header');
  gridContainer.style.gridTemplateColumns = `repeat(${uniqueTitles.length}, 150px)`;
  gridContainer.style.gridTemplateRows = `repeat(${uniqueStyles.length}, 150px)`;

  // create datamap for quick lookups
  const dataMap = {};
  imageData.forEach(item => {
      if (!dataMap[item.style]) dataMap[item.style] = {};
      dataMap[item.style][item.title] = item;
  });


  // create headers
  uniqueTitles.forEach(title => {
      const titleEl = document.createElement('div');
      titleEl.className = 'axis-title';
      titleEl.textContent = title;
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
              img.src = `${encodeURIComponent(itemData.image)}`;
              img.alt = `${itemData.title} - ${itemData.style}`;
              img.title = `${itemData.title} - ${itemData.style}`;
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
}

document.addEventListener('DOMContentLoaded', main);
