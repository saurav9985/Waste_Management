(function () {
  const d = window.__CHART_DATA__;
  if (!d || typeof Chart === 'undefined') return;

  const brand = {
    green: '#2D7D46',
    amber: '#F5A623',
    blue: '#4A90D9',
    red: '#E84040',
    muted: '#6B7B6E',
  };

  const dailyCtx = document.getElementById('chart-daily');
  if (dailyCtx) {
    new Chart(dailyCtx, {
      type: 'line',
      data: {
        labels: d.dailyLabels,
        datasets: [
          {
            label: 'Complaints filed',
            data: d.dailyValues,
            borderColor: brand.green,
            backgroundColor: 'rgba(45, 125, 70, 0.1)',
            tension: 0.3,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } },
      },
    });
  }

  const catCtx = document.getElementById('chart-category');
  if (catCtx) {
    new Chart(catCtx, {
      type: 'doughnut',
      data: {
        labels: d.categoryLabels,
        datasets: [
          {
            data: d.categoryValues,
            backgroundColor: [brand.green, brand.amber, brand.blue, brand.red, '#27AE60', brand.muted],
          },
        ],
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } },
    });
  }

  const statusCtx = document.getElementById('chart-status');
  if (statusCtx) {
    new Chart(statusCtx, {
      type: 'bar',
      data: {
        labels: d.statusLabels,
        datasets: [
          {
            label: 'Complaints',
            data: d.statusValues,
            backgroundColor: [brand.amber, brand.blue, brand.green, brand.red],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } },
      },
    });
  }

  const zoneCtx = document.getElementById('chart-zones');
  if (zoneCtx && d.zoneLabels.length) {
    new Chart(zoneCtx, {
      type: 'bar',
      data: {
        labels: d.zoneLabels,
        datasets: [
          {
            label: 'Avg fill %',
            data: d.zoneAvgFill,
            backgroundColor: brand.green,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, max: 100 } },
      },
    });
  }
})();
