
//====================================================================
var map;
var markers = [] ;
var markerGroup ;

var grat;

var filter;
var depthDimension;
var depthGrouping;
var ageDimension;
var ageGrouping;
var archiveDimension;
var archiveGrouping;
var materialDimension;
var materialGrouping;

var latDimension;
var lngDimension;
var idDimension;
var idGrouping;

//====================================================================
function init() {

//d3.tsv("proxies_select.tsv", function(data) {
d3.tsv("proxies.tsv", function(data) {
  data.forEach(function(d) {
	d.Longitude = +d.Longitude;
	d.Latitude = +d.Latitude;
	d.Depth = +d.Depth;
	d.OldestDate = +d.OldestDate;
	d.RecentDate = +d.RecentDate;
  });
  points=data;

  initMap();
  initCrossfilter();

// bind map bounds to lat/lng filter dimensions
  latDimension = filter.dimension(function(d) { return d.Latitude; });
  lngDimension = filter.dimension(function(d) { return d.Longitude; });

  map.on("moveend", function() {
    var bounds = map.getBounds();
    var northEast = bounds.getNorthEast();
    var southWest = bounds.getSouthWest();

    // NOTE: need to be careful with the dateline here
    latDimension.filterRange([southWest.lat, northEast.lat]);
    lngDimension.filterRange([southWest.lng, northEast.lng]);

    update1();
  });

// dimension and group for looking up currently selected markers
  idDimension = filter.dimension(function(d, i) { return i; });
  idGrouping = idDimension.group(function(id) { return id; });

  // Render the total.
  d3.selectAll("#total")
            .text(filter.size());

  initList();

  update1();

});

}


//====================================================================
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
   //markers[i] = new L.Marker([point.Latitude, point.Longitude], {icon: myIcon});
   markers[i] = new customMarker([points[i].Latitude, points[i].Longitude], {icon: myIcon, Id: (i+1).toString()});
   markers[i].bindPopup(
		  "Id: " + "<b>" + points[i].Id + "</b></br>"
		+ "Position: " + "<b>" + points[i].Longitude.toFixed(2) + "°E</b>, <b>" + points[i].Latitude.toFixed(2) + "°N</b></br>"
		+ "Depth (m): " + "<span style='color: #2EA3DB;'><b>" +  points[i].Depth.toFixed(2) + "</b></span></br>"
		+ "Date (ka): " + "<span style='color: #C9840B;'>" + "from <b>" + points[i].RecentDate.toFixed(2) + "</b> to <b>" + points[i].OldestDate.toFixed(2) + "</b></span></br>"
		+ "Archive: " + "<b>" + points[i].Archive + "</b></br>"
		+ "Material: " + "<b>" + points[i].Material + "</b></br>"
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

//====================================================================
function initCrossfilter() {

  //-----------------------------------
  filter = crossfilter(points);

  //-----------------------------------
  depthRange = [0., 5000.];
  depthBinWidth = 100.;
  depthDimension = filter.dimension( function(d) { 
	// Threshold
	var depthThresholded = d.Depth;
	if (depthThresholded <= depthRange[0]) depthThresholded = depthRange[0];
	if (depthThresholded >= depthRange[1]) depthThresholded = depthRange[1] - depthBinWidth;
	return depthBinWidth*Math.floor(depthThresholded/depthBinWidth);
      });
  depthGrouping = depthDimension.group();

  ageRange = [-10., 500.];
  ageBinWidth = 10.;
  ageDimension = filter.dimension( function(d) {
	// Threshold
	var ageThresholded = d.OldestDate;
	if (ageThresholded <= ageRange[0]) ageThresholded = ageRange[0];
	if (ageThresholded >= ageRange[1]) ageThresholded = ageRange[1]- ageBinWidth;
        return ageBinWidth*Math.floor(ageThresholded/ageBinWidth);
      });
  ageGrouping = ageDimension.group();

  archiveDimension = filter.dimension( function(d) { return d.Archive; });
  archiveGrouping = archiveDimension.group();

  materialDimension = filter.dimension( function(d) { return d.Material; });
  materialGrouping = materialDimension.group();

  //-----------------------------------
  depthChart  = dc.barChart("#chart-depth");
  ageChart  = dc.barChart("#chart-age");
  archiveChart  = dc.rowChart("#chart-archive");
  materialChart  = dc.rowChart("#chart-material");

  //-----------------------------------
  depthChart
    .width(380)
    .height(200)
    .margins({top: 10, right: 20, bottom: 30, left: 30})	
    .centerBar(false)
    .elasticY(true)
    .dimension(depthDimension)
    .group(depthGrouping)
    .on("preRedraw",update0)
    .x(d3.scale.linear().domain(depthRange))
    .xUnits(dc.units.fp.precision(depthBinWidth))
    .round(function(d) {return depthBinWidth*Math.floor(d/depthBinWidth)})
    .gap(0)
    .renderHorizontalGridLines(true);

  xAxis_depthChart = depthChart.xAxis();
  xAxis_depthChart.ticks(6).tickFormat(d3.format("d"));
  yAxis_depthChart = depthChart.yAxis();
  yAxis_depthChart.tickFormat(d3.format("d")).tickSubdivide(0);

  //-----------------------------------
  ageChart
    .width(380)
    .height(200)
    .margins({top: 10, right: 20, bottom: 30, left: 30})	
    .colors(["#F5B441"])
    .centerBar(false)
    .elasticY(true)
    .dimension(ageDimension)
    .group(ageGrouping)
    .on("preRedraw",update0)
    .x(d3.scale.linear().domain(ageRange))
    .xUnits(dc.units.fp.precision(ageBinWidth))
    .round(function(d) {return ageBinWidth*Math.floor(d/ageBinWidth)})
    .gap(0)
    .renderHorizontalGridLines(true);

  xAxis_ageChart = ageChart.xAxis();
  xAxis_ageChart.ticks(6).tickFormat(d3.format("d"));
  yAxis_ageChart = ageChart.yAxis();
  yAxis_ageChart.tickFormat(d3.format("d")).tickSubdivide(0);	//tickSubdivide(0) still 1 subtick

  //-----------------------------------
  Ice_color = "#d6dbe0";
  Lake_color = "#6d87a8";
  Ocean_color = "#008cb2";
  Speleothem_color = "#afa393";
  Tree_color = "#568e14";
  var archiveColors = d3.scale.ordinal()
   	.range([Ice_color, Lake_color, Ocean_color, Speleothem_color, Tree_color]);

  archiveChart
    .width(180)
    .height(200)
    .margins({top: 10, right: 10, bottom: 30, left: 10})	
    .dimension(archiveDimension)
    .group(archiveGrouping)
    .colors(archiveColors)
    .elasticX(true)
    .gap(2)
    .xAxis().ticks(4);

  //-----------------------------------
  materialChart
    .width(180)
    .height(200)
    .margins({top: 10, right: 10, bottom: 30, left: 10})	
    .dimension(materialDimension)
    .group(materialGrouping)
    .colors(d3.scale.category10()) 
    .elasticX(true)
    .gap(2)
    .xAxis().ticks(4);

  //-----------------------------------
  dc.renderAll();

}

//====================================================================
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

//====================================================================
// Update map markers, list and number of selected
function update0() {
  updateMarkers();
  updateList();
  d3.select("#active").text(filter.groupAll().value());
}

//====================================================================
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

//====================================================================
function initList() {
  var proxyItem = d3.select("#proxiesListTitle")
  		.append("div")
  		.attr("class", "row");
  proxyItem.append("div")
   	.attr("class", "col-md-1")
   	.style("width", "50px")
   	.text("Id");
  proxyItem.append("div")
   	.attr("class", "col-md-1")
   	.style("width", "80px")
   	.style("text-align", "right")
   	.text("Depth");
  proxyItem.append("div")
   	.attr("class", "col-md-1")
   	.style("text-align", "right")
   	.text("Most recent");
  proxyItem.append("div")
   	.attr("class", "col-md-1")
   	.style("text-align", "right")
   	.text("Oldest");
  proxyItem.append("div")
   	.attr("class", "col-md-1")
   	.style("text-align", "left")
   	.text("Archive");
  proxyItem.append("div")
   	.attr("class", "col-md-2")
   	.style("text-align", "left")
   	.text("Material");
  proxyItem.append("div")
        .attr("class", "col-md-2")
   	.style("text-align", "left")
   	.text("DOI");
  proxyItem.append("div")
        .attr("class", "col-md-3")
   	.style("width", "350px")
   	.style("text-align", "left")
   	.text("Reference");

  format1 = d3.format(".0f");
  format2 = d3.format(".2f");

  var pointIds = idGrouping.all();
  for (var i = 0; i < pointIds.length; i++) {
  	var proxyItem = d3.select("#proxiesList")
    			.append("div")
    			.attr("class", "proxyItem row")
         		.attr("id", (i+1).toString());
  	proxyItem.append("div")
         	.attr("class", "col-md-1")
   		.style("width", "50px")
         	.attr("title", "#"+ points[i].Id)
         	.text("#"+points[i].Id)
		.on("mouseover", function() { d3.select(this).style("font-weight", "bold"); })
		.on("mouseout", function() { d3.select(this).style("font-weight", "normal"); })
		.on('click', popupfromlist);
  	proxyItem.append("div")
         	.attr("class", "col-md-1")
   		.style("width", "80px")
         	.style("text-align", "right")
		.style("color", "#2EA3DB")
         	.attr("title", points[i].Depth)
         	.text(format1(points[i].Depth));
  	proxyItem.append("div")
         	.attr("class", "col-md-1")
         	.style("text-align", "right")
		.style("color", "#F5B441")
                .attr("title", points[i].RecentDate)
                .text(format2(points[i].RecentDate));
        proxyItem.append("div")
                .attr("class", "col-md-1")
                .style("text-align", "right")
                .style("color", "#F5B441")
         	.attr("title", points[i].OldestDate)
         	.text(format2(points[i].OldestDate));
  	proxyItem.append("div")
         	.attr("class", "col-md-1")
         	.style("text-align", "left")
         	.attr("title", points[i].Archive)
         	.text(points[i].Archive);
  	proxyItem.append("div")
         	.attr("class", "col-md-2")
         	.style("text-align", "left")
         	.attr("title", points[i].Material)
         	.text(points[i].Material);
  	proxyItem.append("div")
         	.attr("class", "col-md-2")
         	.style("text-align", "left")
         	.attr("title", points[i].DOI)
         	.text(points[i].DOI)
		.on("mouseover", function() { d3.select(this).style("color", "#0645AD"); })
		.on("mouseout", function() { d3.select(this).style("color", "#333"); })
		.on("click", function(d,i) { window.open("https://scholar.google.fr/scholar?q=" + points[i].DOI); });
  	proxyItem.append("div")
         	.attr("class", "col-md-3")
   		.style("width", "350px")
         	.style("text-align", "left")
         	.attr("title", points[i].Reference)
         	.text(points[i].Reference);
  }
}

//====================================================================
function popupfromlist() {
	var id = d3.select(this).text().split('#').pop();
	var i = id -1;
	var lng = points[i].Longitude;
	var lat = points[i].Latitude;
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
	var scrollTo = $("#" + id);
	container.scrollTop( scrollTo.offset().top - container.offset().top + container.scrollTop() );
        $(".proxyItem").css("font-weight", "normal");
	$("#"+this.id).css("font-weight", "bold");
}

//====================================================================
function updateList() {
  var pointIds = idGrouping.all();
  for (var i = 0; i < pointIds.length; i++) {
    if (pointIds[i].value > 0)
	 $("#"+(i+1)).show();
    else
	 $("#"+(i+1)).hide();
  }
}

//====================================================================
