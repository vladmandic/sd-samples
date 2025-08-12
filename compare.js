async function main() {
  res = await fetch('images/history.json');
  const imageData = await res.json();
  imageData.forEach(item => item.image = `images/${item.image.split('/').pop()}`);
  imageData.forEach(item => item.style = item.style.replace('Fixed ', ''));

  const gridContainer = document.getElementById('grid-container');
  const xAxisHeader = document.getElementById('x-axis-header');
  const yAxisHeader = document.getElementById('y-axis-header');
  const detailsContent = document.getElementById('details-content');

  // 1. Extract unique titles and styles
  const uniqueTitles = [...new Set(imageData.map(item => item.title))];
  const uniqueStyles = [...new Set(imageData.map(item => item.style))];

  // 2. Map data for quick lookup: map[style][title] = item
  const dataMap = {};
  imageData.forEach(item => {
      if (!dataMap[item.style]) dataMap[item.style] = {};
      dataMap[item.style][item.title] = item;
  });

  // 3. Setup CSS Grid dimensions
  gridContainer.style.gridTemplateColumns = `repeat(${uniqueTitles.length}, 150px)`;
  gridContainer.style.gridTemplateRows = `repeat(${uniqueStyles.length}, 150px)`;

  // 4. Create Headers
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

  // 5. Populate the grid
  uniqueStyles.forEach(style => {
      uniqueTitles.forEach(title => {
          const cell = document.createElement('div');
          cell.className = 'grid-cell';
          const itemData = dataMap[style] ? dataMap[style][title] : null;

          if (itemData) {
              const img = document.createElement('img');
              // IMPORTANT: Replace with the actual URL to your images.
              // Using a placeholder as the provided path is local.
              img.src = `${encodeURIComponent(itemData.image)}`;
              img.alt = `${itemData.title} - ${itemData.style}`;
              img.title = `${itemData.title} - ${itemData.style}`;
              cell.appendChild(img);

              cell.addEventListener('mouseover', () => updateDetails(itemData));
          } else {
              cell.classList.add('empty');
          }
          gridContainer.appendChild(cell);
      });
  });
  
  // Sync scrolling between headers and grid
  gridContainer.addEventListener('scroll', () => {
      xAxisHeader.scrollLeft = gridContainer.scrollLeft;
      yAxisHeader.scrollTop = gridContainer.scrollTop;
  });

  function updateDetails(item) {
      const info = JSON.parse(item.info);
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
}

document.addEventListener('DOMContentLoaded', main);
