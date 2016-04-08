(function() {
  /* global L:true */
  'use strict';

  L.Control.MousePosition = L.Control.extend({
    options: {
      position  : 'topright',
      //emptyData : 'Нет данных',
      accuracy  : 7
    },

    onAdd: function(map) {
      var container = L.DomUtil.create('div', 'leaflet-control-mouseposition leaflet-bar leaflet-control'),
          lat       = L.DomUtil.create('div', 'leaflet-control-mouseposition-row', container),
          lng       = L.DomUtil.create('div', 'leaflet-control-mouseposition-row', container);

      lat.innerHTML = 'Широта:';
      lng.innerHTML = 'Долгота:';
      this._lat     = L.DomUtil.create('span', 'leaflet-control-mouseposition-coord', lat);
      this._lng     = L.DomUtil.create('span', 'leaflet-control-mouseposition-coord', lng);

      L.DomEvent.disableClickPropagation(container);
      map.on('mousemove', this.checkPosition, this);

      return container;
    },

    onRemove: function(map) { map.off('mousemove', this.checkPosition); },

    checkPosition: function(e) {
      this._lat.innerText = L.Util.formatNum(e.latlng.lat, this.options.accuracy);
      this._lng.innerHTML = L.Util.formatNum(e.latlng.lng, this.options.accuracy);
    }
  });

  L.Map.mergeOptions({ positionControl: false });

  L.Map.addInitHook(function() {
    if (this.options.positionControl) {
      this.positionControl = new L.Control.MousePosition();
      this.addControl( this.positionControl );
    }
  });

  L.control.mousePosition = function(options) {
    return new L.Control.MousePosition(options);
  };

}());
