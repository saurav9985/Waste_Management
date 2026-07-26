(function () {
  function initAdmin() {
    if (!window.__ADMIN_ROUTE_PAGE__ || !window.google || !google.maps) {
      const el = document.getElementById('admin-map');
      if (el) el.innerHTML = '<p class="map-fallback">Add a valid GOOGLE_MAPS_API_KEY to load the map.</p>';
      return;
    }
    const depotEl = document.getElementById('admin-map');
    const depotLat = parseFloat(depotEl.dataset.depotLat, 10);
    const depotLng = parseFloat(depotEl.dataset.depotLng, 10);
    const map = new google.maps.Map(depotEl, {
      center: { lat: depotLat, lng: depotLng },
      zoom: 12,
      mapTypeControl: false,
    });
    new google.maps.Marker({
      position: { lat: depotLat, lng: depotLng },
      map,
      title: 'Depot',
      icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#4A90D9', fillOpacity: 1, strokeWeight: 1 },
    });
    const bins = window.__BINS__ || [];
    bins.forEach((b) => {
      if (b.lat == null || b.lng == null) return;
      new google.maps.Marker({
        position: { lat: b.lat, lng: b.lng },
        map,
        title: b.binId,
      });
    });

    let routePolyline = null;

    const btn = document.getElementById('btn-generate');
    const statusEl = document.getElementById('route-status');
    const stepsEl = document.getElementById('direction-steps');
    const fieldOrdered = document.getElementById('field-ordered');
    const fieldPoly = document.getElementById('field-poly');
    const fieldLegs = document.getElementById('field-legs');

    if (btn) {
      btn.addEventListener('click', async () => {
        const boxes = document.querySelectorAll('#route-select-form input[name="binIds"]:checked');
        const binIds = Array.from(boxes).map((x) => x.value);
        if (!binIds.length) {
          statusEl.textContent = 'Select at least one bin.';
          return;
        }
        statusEl.textContent = 'Finding the best route for your drivers...';
        try {
          const res = await fetch('/admin/routes/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ binIds }),
          });
          const data = await res.json();
          if (!data.ok) {
            statusEl.textContent = data.message || 'Could not build route.';
            return;
          }
          fieldOrdered.value = data.orderedBinIds.join(',');
          fieldPoly.value = data.encodedPolyline || '';
          fieldLegs.value = (data.steps || []).slice(0, 400).join(' · ');
          if (data.encodedPolyline && google.maps.geometry && google.maps.geometry.encoding) {
            if (routePolyline) routePolyline.setMap(null);
            const path = google.maps.geometry.encoding.decodePath(data.encodedPolyline);
            routePolyline = new google.maps.Polyline({
              path,
              strokeColor: '#2D7D46',
              strokeOpacity: 0.9,
              strokeWeight: 4,
              map,
            });
            const bounds = new google.maps.LatLngBounds();
            path.forEach(function (p) {
              bounds.extend(p);
            });
            map.fitBounds(bounds);
          }
          if (stepsEl && data.steps) {
            stepsEl.innerHTML = '<ol>' + data.steps.map((s) => '<li>' + escapeHtml(s) + '</li>').join('') + '</ol>';
          }
          statusEl.textContent = 'Route ready — assign to a driver when you are happy.';
        } catch (e) {
          console.error(e);
          statusEl.textContent = 'Network error — try again.';
        }
      });
    }
  }

  function initDriver() {
    if (!window.__DRIVER_ROUTE_PAGE__ || !window.google || !google.maps) {
      const el = document.getElementById('driver-map');
      if (el) el.innerHTML = '<p class="map-fallback">Add a valid GOOGLE_MAPS_API_KEY to load the map.</p>';
      return;
    }
    const el = document.getElementById('driver-map');
    const depotLat = parseFloat(el.dataset.depotLat, 10);
    const depotLng = parseFloat(el.dataset.depotLng, 10);
    const map = new google.maps.Map(el, {
      center: { lat: depotLat, lng: depotLng },
      zoom: 12,
    });
    new google.maps.Marker({
      position: { lat: depotLat, lng: depotLng },
      map,
      title: 'Depot',
    });
    const bins = window.__DRIVER_BINS__ || [];
    const bounds = new google.maps.LatLngBounds();
    bounds.extend({ lat: depotLat, lng: depotLng });
    bins.forEach((b) => {
      if (b.lat == null || b.lng == null) return;
      bounds.extend({ lat: b.lat, lng: b.lng });
      const infowindow = new google.maps.InfoWindow({
        content:
          '<div><strong>' +
          escapeHtml(b.binId) +
          '</strong><br/>' +
          b.fillLevel +
          '%<br/>' +
          escapeHtml(b.address || '') +
          '</div>',
      });
      const m = new google.maps.Marker({
        position: { lat: b.lat, lng: b.lng },
        map,
        title: b.binId,
      });
      m.addListener('click', () => infowindow.open(map, m));
    });
    map.fitBounds(bounds);
    const poly = window.__ROUTE_POLY__;
    if (poly && google.maps.geometry && google.maps.geometry.encoding) {
      const path = google.maps.geometry.encoding.decodePath(poly);
      new google.maps.Polyline({
        path,
        strokeColor: '#2D7D46',
        strokeOpacity: 0.9,
        strokeWeight: 4,
        map,
      });
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  window.addEventListener('load', () => {
    if (window.__ADMIN_ROUTE_PAGE__) initAdmin();
    if (window.__DRIVER_ROUTE_PAGE__) initDriver();
  });
})();
