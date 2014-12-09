
var map;
var markers = [] ;
var markerGroup ;

var grat;

var filter;
var depthDimension;
var depthGrouping;
var oldestDateDimension;
var oldestDateGrouping;
var proxyDimension;
var proxyGrouping;
var charts;
var domCharts;

var latDimension;
var lonDimension;
var idDimension;
var idGrouping;

function init() {

d3.tsv("proxies.tsv", function(data) {
    data.forEach(function(d) {
	d.lng= +d.Longitude;
	d.lat= +d.Latitude;
	d.depth= +d.Depth;
	d.oldestDate= +d.OldestDate;
	d.recentDate= +d.RecentDate;
	d.proxy= +d.Proxy;
	});
     points=data;

  initMap();
  initCrossfilter();

// bind map bounds to lat/lon filter dimensions
  latDimension = filter.dimension(function(p) { return p.lat; });
  lonDimension = filter.dimension(function(p) { return p.lng; });

  map.on("moveend", function() {
    var bounds = map.getBounds();
    var northEast = bounds.getNorthEast();
    var southWest = bounds.getSouthWest();

    // NOTE: need to be careful with the dateline here
    latDimension.filterRange([southWest.lat, northEast.lat]);
    lonDimension.filterRange([southWest.lng, northEast.lng]);

    update1();
  });

// dimension and group for looking up currently selected markers
  idDimension = filter.dimension(function(p, i) { return i; });
  idGrouping = idDimension.group(function(id) { return id; });

  // Render the total.
  d3.selectAll("#total")
            .text(filter.size());

  initList();

  update1();

});

}


function initMap() {

var mapmadeUrl = 'http://services.arcgisonline.com/ArcGIS/rest/services/Ocean_Basemap/MapServer/tile/{z}/{y}/{x}',
    mapmadeAttribution = 'LSCE &copy; 2014 | Baselayer &copy; ArcGis',
    mapmade = new L.TileLayer(mapmadeUrl, {maxZoom: 10, attribution: mapmadeAttribution}),
    maplatlng = new L.LatLng(0, 0);

map = new L.Map('map', {center: maplatlng, zoom: 1, layers: [mapmade]});

grat_10 = L.graticule({ interval: 10, style: { color: '#333', weight: 1, opacity: 1. } }).addTo(map);
grat_05 = L.graticule({ interval: 05, style: { color: '#333', weight: 1, opacity: 0. } }).addTo(map);
grat_01 = L.graticule({ interval: 01, style: { color: '#333', weight: 1, opacity: 0. } }).addTo(map);

mousepos = new L.Control.MousePosition({lngFirst: true}).addTo(map);

mapmade2 = new L.TileLayer(mapmadeUrl, { maxZoom: 7, attribution: mapmadeAttribution });
miniMap = new L.Control.MiniMap(mapmade2, { toggleDisplay: true, zoomLevelOffset: -6 }).addTo(map);

myIcon = L.icon({
    iconUrl: 'LSCE_Icon.png',
    iconSize: [20, 20], 
    iconAnchor: [10, 0] 
});

myIconBright = L.icon({
    iconUrl: 'LSCE_IconBright.png',
    iconSize: [20, 20], 
    iconAnchor: [10, 0] 
});

markerGroup = new L.MarkerClusterGroup({maxClusterRadius: 50, showCoverageOnHover: false});

//http://stackoverflow.com/questions/17423261/how-to-pass-data-with-marker-in-leaflet-js
customMarker = L.Marker.extend({
   options: { 
      Id: 'Custom data!'
   }
});

// create array of markers from points and add them to the map
for (var i = 0; i < points.length; i++) {
   //markers[i] = new L.Marker([point.lat, point.lng], {icon: myIcon});
   markers[i] = new customMarker([points[i].lat, points[i].lng], {icon: myIcon, Id: (i+1).toString()});
   markers[i].bindPopup(
		  "Id: #" + "<b>" + (i+1).toString() + "</b> "
		+ "Core: " + "<b>" + points[i].Core + "</b></br>"
		+ "Position: " + "<b>" + points[i].lng.toFixed(2) + "°E</b>, <b>" + points[i].lat.toFixed(2) + "°N</b></br>"
		+ "Depth (m): " + "<span style='color: #2EA3DB;'><b>" +  points[i].depth.toFixed(2) + "</b></span></br>"
		+ "Date (ka): " + "<span style='color: #C9840B;'>" + "from <b>" + points[i].recentDate.toFixed(2) + "</b> to <b>" + points[i].oldestDate.toFixed(2) + "</b></span></br>"
		+ "Proxy: " + "<b>" + points[i].Proxy + "</b></br>"
		,{autoPan: true, keepInView: true, closeOnClick: false}
		);
   markers[i].on('mouseover', function(e) {
	 e.target.setIcon(myIconBright);
	 e.target.openPopup();
	 //console.log(e.target.options.Id);
	 var container = $("#proxiesList");
	 var scrollTo = $("#"+e.target.options.Id);
	 container.scrollTop( scrollTo.offset().top - container.offset().top + container.scrollTop() );
	 scrollTo.css("font-weight", "bold");
	});
   markers[i].on('mouseout', function(e) {
	 e.target.setIcon(myIcon);
	 e.target.closePopup();
         $(".proxyItem").css("font-weight", "normal");
	});
   markerGroup.addLayer(markers[i]);
}
map.addLayer(markerGroup);

}

function initCrossfilter() {
  filter = crossfilter(points);

  // simple dimensions and groupings for major variables
  depthDimension = filter.dimension(
      function(p) {
        return p.depth;
      });
  depthGrouping = depthDimension.group(
      function(v) {
        return Math.floor(v);
      });

  oldestDateDimension = filter.dimension(
      function(p) {
	// Threshold age
	if (p.oldestDate >= 500) p.oldestDate = 499;
	if (p.oldestDate <= 0) p.oldestDate = -1;
        return p.oldestDate;
      });
  oldestDateGrouping = oldestDateDimension.group(
      function(v) {
        return Math.floor(v);
      });

  proxyDimension = filter.dimension(
      function(p) {
        return p.Proxy;
      });
  proxyGrouping = proxyDimension.group();

  depthChart  = dc.barChart("#chart-depth"),
  ageChart  = dc.barChart("#chart-age"),
  proxyChart  = dc.rowChart("#chart-proxy"),

  depthChart
    .width(400)
    .height(200)
    .centerBar(false)
    .elasticY(true)
    .xUnits(function(){return 50;})
    .dimension(depthDimension)
    .group(depthGrouping)
    .on("preRedraw",update0)
    .x(d3.scale.linear()
          .domain([0, 5000]))
    .renderHorizontalGridLines(true);

  xAxis_depthChart = depthChart.xAxis();
  xAxis_depthChart.ticks(6).tickFormat(d3.format(".0f"));

  ageChart
    .width(400)
    .height(200)
    .colors(["#F5B441"])
    .centerBar(false)
    .elasticY(true)
    .xUnits(function(){return 50;})
    .dimension(oldestDateDimension)
    .group(oldestDateGrouping)
    .x(d3.scale.linear()
          .domain([-10, 500]))
    .renderHorizontalGridLines(true);

  proxyChart
    .width(200)
    .height(200)
    .margins({top: 10, right: 10, bottom: 30, left: 10})		// Default margins: {top: 10, right: 50, bottom: 30, left: 30}.
    .dimension(proxyDimension)
    .group(proxyGrouping)
    .colors(d3.scale.category20()) 
    .elasticX(true)
    .gap(0)
    .xAxis().ticks(4);

  dc.renderAll();

}

// set visibility of markers based on crossfilter
function updateMarkers() {
  var pointIds = idGrouping.all();
  for (var i = 0; i < pointIds.length; i++) {
    if (pointIds[i].value > 0)
    	markerGroup.addLayer(markers[i]);
    else  
    	markerGroup.removeLayer(markers[i]);
  }
}

// Update map markers, list and number of selected
function update0() {
  updateMarkers();
  updateList();
  d3.select("#active").text(filter.groupAll().value());
}

// Update dc charts, map markers, list and number of selected
function update1() {
  dc.redrawAll();
  updateMarkers();
  updateList();
  d3.select("#active").text(filter.groupAll().value());
  levelZoom = map.getZoom();
  switch(true) {
	case (levelZoom > 5): 
		grat_01.setStyle({opacity: 1.});
		break;
	case (levelZoom > 3): 
		grat_01.setStyle({opacity: 0.});
		grat_05.setStyle({opacity: 1.});
		break;
	default : 
		grat_01.setStyle({opacity: 0.});
		grat_05.setStyle({opacity: 0.});
		break;
  }
}

function initList() {
  var proxyItem = d3.select("#proxiesListTitle")
  		.append("div")
   		.style("background", "#ddd")
   		.style("font-style", "italic")
  		.attr("class", "row");
  proxyItem.append("div")
   	.attr("class", "col-md-1")
   	.text("Id");
  proxyItem.append("div")
   	.attr("class", "col-md-2")
   	.text("Core");
  proxyItem.append("div")
   	.attr("class", "col-md-1")
   	.style("text-align", "right")
   	.text("Depth");
  proxyItem.append("div")
   	.attr("class", "col-md-1")
   	.style("text-align", "right")
   	.text("Oldest");
  proxyItem.append("div")
   	.attr("class", "col-md-2")
   	.style("text-align", "right")
   	.text("Proxy");
  proxyItem.append("div")
   	.attr("class", "col-md-2")
   	.style("text-align", "right")
   	.text("Species");
  proxyItem.append("div")
        .attr("class", "col-md-3")
   	.style("text-align", "right")
   	.text("Reference");

  var pointIds = idGrouping.all();
  for (var i = 0; i < pointIds.length; i++) {
  	var proxyItem = d3.select("#proxiesList")
    			.append("div")
    			.attr("class", "proxyItem row")
         		.attr("id", (i+1).toString())
			.on('click', popupfromlist);
  	proxyItem.append("div")
         	.attr("class", "col-md-1")
         	.attr("title", "#"+(i+1).toString())
         	.text("#"+(i+1).toString());
  	proxyItem.append("div")
         	.attr("class", "col-md-2")
         	.attr("title", points[i].Core)
         	.text(points[i].Core);
  	proxyItem.append("div")
         	.attr("class", "col-md-1")
         	.style("text-align", "right")
		.style("color", "#2EA3DB")
         	.attr("title", points[i].Depth)
         	.text(points[i].Depth);
  	proxyItem.append("div")
         	.attr("class", "col-md-1")
         	.style("text-align", "right")
		.style("color", "#F5B441")
         	.attr("title", points[i].OldestDate)
         	.text(points[i].OldestDate);
  	proxyItem.append("div")
         	.attr("class", "col-md-2")
         	.style("text-align", "right")
         	.attr("title", points[i].Proxy)
         	.text(points[i].Proxy);
  	proxyItem.append("div")
         	.attr("class", "col-md-2")
         	.style("text-align", "right")
         	.attr("title", points[i].Species)
         	.text(points[i].Species);
  	proxyItem.append("div")
         	.attr("class", "col-md-3")
         	.style("text-align", "right")
         	.attr("title", points[i].Reference)
         	.text(points[i].Reference);
  }
}

function popupfromlist() {
	var i = this.id - 1;
	var lng = points[i].lng;
	var lat = points[i].lat;
	console.log(i, lng.toFixed(2), lat.toFixed(2));
	//map.setView(new L.LatLng(lat,lng), 6);
	//map.panTo(new L.LatLng(lat,lng));
	//markers[i].openPopup();
	// https://github.com/Leaflet/Leaflet.markercluster/issues/46
	var m = markers[i];
	markerGroup.zoomToShowLayer(m, function () {
				map.setView(new L.LatLng(lat,lng), 6);  // added to handle single marker
				m.openPopup();
			});
	var container = $("#proxiesList");
	var scrollTo = $("#" + this.id);
	container.scrollTop( scrollTo.offset().top - container.offset().top + container.scrollTop() );
        $(".proxyItem").css("font-weight", "normal");
	$("#"+this.id).css("font-weight", "bold");
}

function updateList() {
  var pointIds = idGrouping.all();
  for (var i = 0; i < pointIds.length; i++) {
    if (pointIds[i].value > 0)
	 $("#"+(i+1)).show();
    else
	 $("#"+(i+1)).hide();
  }
}

