//====================================================================
var map;
var mapMaxZoom = 8;

var markers = [];
var markerGroup;

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

var points = [];

// depthChart vars
var depthThresholded;
var depthRange = [0., 5000.];
var depthBinWidth = 100.;

// ageChart vars
var age1Thresholded, age2Thresholded;
var age1Range = [-2.5, 50.];
var age2Range = [-2.5, 50.];
var ageBinWidth = 1.;

var archiveArray = ["Ice",
                    "Lake",
                    "Ocean",
                    "Speleothem",
                    "Tree"
];

var materialArray = [ "Carbonate",
                      "Non-Carbonate",
                      "Cellulose",
                      "Coral",
                      "Benthic foraminifera",
                      "Planktonic foraminifera",
                      "Ice",
                      "Speleothem",
                      "Others",
                      "Unknown"
];

var Ice_color = "#008cb2";
var Lake_color = "#314f6f";
var Ocean_color = "#81a6d3";
var Speleothem_color = "#afa393";
var Tree_color = "#568e14";
var Carbonate_color = "#ff0000";
var NonCarbonate_color = "#903373";
var Cellulose_color = Tree_color;
var Coral_color = "#ff7f50";
var PlanktonicForaminifera_color = Ocean_color;
var BenthicForaminifera_color = Ocean_color;
var Unkown_color = "#FF4400";
var Others_color = "#FF4400";

//====================================================================
function init() {
    var start = new Date().getTime();

    //d3.tsv("proxies_select.tsv", function(data) {
    d3.tsv("proxies.tsv", function(data) {

        data.forEach(function(d) {

            // Coerce to number
            d.Longitude = +d.Longitude;
            d.Latitude = +d.Latitude;
            d.Depth = +d.Depth;
            d.OldestDate = +d.OldestDate;
            d.RecentDate = +d.RecentDate;

            //------
            // Limit latitudes according to latitude map range (-85:85)
            if (d.Latitude < -85) d.Latitude = -85;
            if (d.Latitude > 85) d.Latitude = 85;

            //------
            // Precalculate depth bins
            if (d.Depth <= depthRange[0]) depthThresholded = depthRange[0];
            else if (d.Depth >= depthRange[1]) depthThresholded = depthRange[1] - depthBinWidth;
            else depthThresholded = d.Depth;
            d.binDepth = depthBinWidth * Math.floor(depthThresholded / depthBinWidth);

            // Precalculate age bins
            // RecentDate
            if (d.RecentDate <= age1Range[0]) age1Thresholded = age1Range[0];
            else if (d.RecentDate >= age1Range[1]) age1Thresholded = age1Range[1] - ageBinWidth;
            else age1Thresholded = d.RecentDate;
            d.binRecentDate = ageBinWidth * Math.floor(age1Thresholded / ageBinWidth);

            // OldestDate
            if (d.OldestDate <= age2Range[0]) age2Thresholded = age2Range[0];
            else if (d.OldestDate >= age2Range[1]) age2Thresholded = age2Range[1] - ageBinWidth;
            else age2Thresholded = d.OldestDate;
            d.binOldestDate = ageBinWidth * Math.floor(age2Thresholded / ageBinWidth);
            
            // Archive
            d.archiveIndex = archiveArray.indexOf(d.Archive);

            // Material 
            d.materialIndex = materialArray.indexOf(d.Material);

        });
        points = data;

        initMap();
        initList();

        initCrossfilter();

        // bind map bounds to lat/lng filter dimensions
        latDimension = filter.dimension(function(d) {
            return Math.round(d.Latitude);
        });
        lngDimension = filter.dimension(function(d) {
            return Math.round(d.Longitude);
        });

        // dimension and group for looking up currently selected markers
        idDimension = filter.dimension(function(d, i) {
            return i;
        });
        idGrouping = idDimension.group();

        // Render the total.
        d3.selectAll("#total").text(filter.size());
        update1();

        //-----------------------------------------
        map.on("moveend", function() {
            var bounds = map.getBounds();
            var northEast = bounds.getNorthEast();
            var southWest = bounds.getSouthWest();

            // NOTE: need to be careful with the dateline here
            latDimension.filterRange([southWest.lat, northEast.lat]);
            lngDimension.filterRange([southWest.lng, northEast.lng]);

            update1();
        });


        var end = new Date().getTime();
        var time = end - start;
        console.log('init() time: ', time);

    });
}

//====================================================================
function initMap() {
    var start = new Date().getTime();

    var mapmadeUrl = 'http://services.arcgisonline.com/ArcGIS/rest/services/Ocean_Basemap/MapServer/tile/{z}/{y}/{x}',
        //var mapmadeUrl = 'http://{s}.tile.osm.org/{z}/{x}/{y}.png',
        mapmadeAttribution = 'LSCE &copy; 2014 | Baselayer &copy; ArcGis',
        mapmade = new L.TileLayer(mapmadeUrl, {
            maxZoom: mapMaxZoom,
            attribution: mapmadeAttribution
        }),
        maplatlng = new L.LatLng(0, 0);

    map = new L.Map('map', {
        center: maplatlng,
        zoom: 1,
        layers: [mapmade],
        zoomControl: false
    });

    var zoomHome = L.Control.zoomHome();
    zoomHome.addTo(map);

    grat_10 = L.graticule({
        interval: 10,
        style: {
            color: '#333',
            weight: 1,
            opacity: 1.
        }
    }).addTo(map);
    grat_05 = L.graticule({
        interval: 05,
        style: {
            color: '#333',
            weight: 1,
            opacity: 0.
        }
    }).addTo(map);
    grat_01 = L.graticule({
        interval: 01,
        style: {
            color: '#333',
            weight: 1,
            opacity: 0.
        }
    }).addTo(map);

    mousepos = new L.Control.MousePosition({
        lngFirst: true
    }).addTo(map);

    mapmade2 = new L.TileLayer(mapmadeUrl, {
        maxZoom: mapMaxZoom + 1,
        attribution: mapmadeAttribution
    });
    miniMap = new L.Control.MiniMap(mapmade2, {
        toggleDisplay: true,
        zoomLevelOffset: -4
    }).addTo(map);

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

    markerGroup = new L.MarkerClusterGroup({
        maxClusterRadius: 50,
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true
    });

    //http://stackoverflow.com/questions/17423261/how-to-pass-data-with-marker-in-leaflet-js
    customMarker = L.Marker.extend({
        options: {
            Id: 'Custom data!'
        }
    });

    // create array of markers from points and add them to the map
    for (var i = 0; i < points.length; i++) {
        //   markers[i] = new L.Marker(new L.LatLng(points[i].Latitude, points[i].Longitude));
        markers[i] = new customMarker([points[i].Latitude, points[i].Longitude], {
            icon: myIcon,
            Id: (i + 1).toString()
        });
        markers[i].bindPopup(
            "Id: " + "<b>" + points[i].Id + "</b></br>" + "Position: " + "<b>" + points[i].Longitude.toFixed(2) + "°E</b>, <b>" + points[i].Latitude.toFixed(2) + "°N</b></br>" + "Depth (m): " + "<span style='color: " + Ocean_color + ";'><b>" + points[i].Depth.toFixed(2) + "</b></span></br>" + "Date (ka): " + "<span style='color: #C9840B;'>" + "from <b>" + points[i].RecentDate.toFixed(2) + "</b> to <b>" + points[i].OldestDate.toFixed(2) + "</b></span></br>" + "Archive: " + "<b>" + points[i].Archive + "</b></br>" + "Material: " + "<b>" + points[i].Material + "</b></br>", {
                autoPan: true,
                keepInView: true,
                closeOnClick: false
            }
        );
        markers[i].on('mouseover', function(e) {
            e.target.setIcon(myIconBright);
            e.target.openPopup();
            var scrollTo = $("#" + e.target.options.Id);
            var container = $("#proxiesList");
            container.scrollTop(scrollTo.offset().top - container.offset().top + container.scrollTop());
            scrollTo.css("font-weight", "bold");
            scrollTo.css("background", "#ccc");
        });
        markers[i].on('mouseout', function(e) {
            e.target.setIcon(myIcon);
            e.target.closePopup();
            var scrollTo = $("#" + e.target.options.Id);
            scrollTo.css("font-weight", "normal");
            scrollTo.css("background", "#eee");
        });
        markerGroup.addLayer(markers[i]);
    }
    map.addLayer(markerGroup);

    var end = new Date().getTime();
    var time = end - start;
    console.log('initMap() time: ', time);
}

//====================================================================
function initCrossfilter() {
    var start = new Date().getTime();

    //-----------------------------------
    filter = crossfilter(points);

    //-----------------------------------
    depthDimension = filter.dimension(function(d) {
        return d.binDepth;
    });
    depthGrouping = depthDimension.group();

    //-----------------------------------
    ageDimension = filter.dimension(function(d) {
        return [d.binOldestDate, d.binRecentDate, d.archiveIndex];
    });
    ageGrouping = ageDimension.group();

    //-----------------------------------
    archiveDimension = filter.dimension(function(d) {
        return d.archiveIndex;
    });
    archiveGrouping = archiveDimension.group();

    //-----------------------------------
    materialDimension = filter.dimension(function(d) {
        return d.materialIndex;
    });
    materialGrouping = materialDimension.group();

    //-----------------------------------
    depthChart = dc.barChart("#chart-depth");
    ageChart = dc.scatterPlot("#chart-age");
    archiveChart = dc.rowChart("#chart-archive");
    materialChart = dc.rowChart("#chart-material");

    //-----------------------------------
    depthChart
        .width(380)
        .height(200)
        .margins({
            top: 10,
            right: 20,
            bottom: 30,
            left: 40
        })
        .centerBar(false)
        .elasticY(true)
        .dimension(depthDimension)
        .group(depthGrouping)
        .on("preRedraw", update0)
        .x(d3.scale.linear().domain(depthRange))
        .xUnits(dc.units.fp.precision(depthBinWidth))
        .round(function(d) {
            return depthBinWidth * Math.floor(d / depthBinWidth)
        })
        .gap(0)
        .renderHorizontalGridLines(true)
        .colors(Ocean_color);

    xAxis_depthChart = depthChart.xAxis();
    xAxis_depthChart.ticks(6).tickFormat(d3.format("d"));
    yAxis_depthChart = depthChart.yAxis();
    yAxis_depthChart.tickFormat(d3.format("d")).tickSubdivide(0);

    //-----------------------------------
    var archiveColors = d3.scale.ordinal()
        .domain([0, 1, 2, 3, 4])
        .range([Ice_color, Lake_color, Ocean_color, Speleothem_color, Tree_color]);

    ageChart
        .width(380)
        .height(200)
        .margins({
            top: 10,
            right: 20,
            bottom: 30,
            left: 40
        })
        .dimension(ageDimension)
        .group(ageGrouping)
        .xAxisLabel("Most recent age")
        .yAxisLabel("Oldest age")
        .on("preRedraw", update0)
        //.mouseZoomable(true)
        .x(d3.scale.linear().domain(age1Range))
        .y(d3.scale.linear().domain(age2Range))
        .round(function(d) {
            return ageBinWidth * Math.floor(d / ageBinWidth)
        })
        .renderHorizontalGridLines(true)
        .renderVerticalGridLines(true)
        .symbolSize(8)
        .highlightedSize(8)
        .existenceAccessor(function(d) {
            return d.value > 0;
        })
        .colorAccessor(function(d) {
            return d.key[2];
        })
        .colors(archiveColors)
        .filterHandler(function(dim, filters) {
            if (!filters || !filters.length)
                dim.filter(null);
            else {
                // assume it's one RangedTwoDimensionalFilter
                dim.filterFunction(function(d) {
                    return filters[0].isFiltered([d[0], d[1]]);
                })
            }
        });
    // https://jsfiddle.net/gordonwoodhull/c593ehh7/5/
    // .colors("#ff0000");

    xAxis_ageChart = ageChart.xAxis();
    xAxis_ageChart.ticks(6).tickFormat(d3.format("d"));
    yAxis_ageChart = ageChart.yAxis();
    yAxis_ageChart.ticks(6).tickFormat(d3.format("d"));

    //-----------------------------------
    archiveChart
        .width(180)
        .height(200)
        .margins({
            top: 10,
            right: 10,
            bottom: 30,
            left: 10
        })
        .dimension(archiveDimension)
        .group(archiveGrouping)
        .colors(archiveColors)
        .elasticX(true)
        .gap(2)
        .label(function(d){
       		return archiveArray[d.key];
    	})
        .xAxis().ticks(4);

    //-----------------------------------
    var materialColors = d3.scale.ordinal()
        .domain([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
        .range([Carbonate_color, NonCarbonate_color, Cellulose_color, Coral_color, BenthicForaminifera_color,
            PlanktonicForaminifera_color, Ice_color, Speleothem_color, Others_color, Unkown_color
        ]);

    materialChart
        .width(180)
        .height(200)
        .margins({
            top: 10,
            right: 10,
            bottom: 30,
            left: 10
        })
        .dimension(materialDimension)
        .group(materialGrouping)
        .on("preRedraw", update0)
        .colors(materialColors)
        .elasticX(true)
        .gap(2)
        .label(function(d){
       		return materialArray[d.key];
    	})
        .xAxis().ticks(4);

    //-----------------------------------
    dc.renderAll();

    var end = new Date().getTime();
    var time = end - start;
    console.log('initCrossfilter() time: ', time);

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
// Trigger by dc.charts to update map markers, list and number of selected 
function update0() {
    updateMarkers();
    updateList();
    d3.select("#active").text(filter.groupAll().value());
}

//====================================================================
// Update dc charts, map markers, list and number of selected
function update1() {
    var start = new Date().getTime();

    dc.redrawAll();
    updateMarkers();
    //updateList();
    d3.select("#active").text(filter.groupAll().value());
    levelZoom = map.getZoom();
    switch (true) {
        case (levelZoom > 5):
            grat_01.setStyle({
                opacity: 1.
            });
            break;
        case (levelZoom > 3):
            grat_01.setStyle({
                opacity: 0.
            });
            grat_05.setStyle({
                opacity: 1.
            });
            break;
        default:
            grat_01.setStyle({
                opacity: 0.
            });
            grat_05.setStyle({
                opacity: 0.
            });
            break;
    }

    var end = new Date().getTime();
    var time = end - start;
    console.log('update1() time: ', time);
}

//====================================================================
function initList() {
    var start = new Date().getTime();

    var proxyItem = d3.select("#proxiesListTitle")
        .append("div")
        .attr("class", "row");
    proxyItem.append("div")
        .attr("class", "col-md-1")
        .style("width", "80px")
        .style("text-align", "left")
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
        .style("width", "320px")
        .style("text-align", "left")
        .text("Reference");

    format1 = d3.format(".0f");
    format2 = d3.format(".2f");

    for (var i = 0; i < points.length; i++) {
        var proxyItem = d3.select("#proxiesList")
            .append("div")
            .attr("class", "proxyItem row")
            .attr("id", (i + 1).toString())
            .on("mouseover", function() {
                d3.select(this).style("font-weight", "bold")
                    .style("background", "#ccc");
            })
            .on("mouseout", function() {
                d3.select(this).style("font-weight", "normal")
                    .style("background", "#eee");
            });
        proxyItem.append("div")
            .attr("class", "col-md-1 pointer")
            .style("width", "80px")
            .style("text-align", "left")
            .attr("title", "#" + points[i].Id)
            .text("#" + points[i].Id)
            .on('click', popupFromList);
        proxyItem.append("div")
            .attr("class", "col-md-1")
            .style("width", "80px")
            .style("text-align", "right")
            //.style("color", Ocean_color)
            .attr("title", points[i].Depth)
            .text(format1(points[i].Depth));
        proxyItem.append("div")
            .attr("class", "col-md-1")
            .style("text-align", "right")
            .attr("title", points[i].RecentDate)
            .text(format2(points[i].RecentDate));
        proxyItem.append("div")
            .attr("class", "col-md-1")
            .style("text-align", "right")
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
            .attr("class", "col-md-2 pointer")
            .style("text-align", "left")
            .attr("title", points[i].DOI)
            .text(points[i].DOI)
            .on("mouseover", function() {
                d3.select(this).style("color", "#0645AD");
            })
            .on("mouseout", function() {
                d3.select(this).style("color", "#333");
            })
            .on("click", function() {
                window.open("https://scholar.google.fr/scholar?q=" + d3.select(this).text());
            });
        proxyItem.append("div")
            .attr("class", "col-md-3")
            .style("width", "320px")
            .style("text-align", "left")
            .attr("title", points[i].Reference)
            .text(points[i].Reference);
    }
    var end = new Date().getTime();
    var time = end - start;
    console.log('initList() time: ', time);

}

//====================================================================
function popupFromList() {
    var id = d3.select(this).text().split('#').pop();
    var i = id - 1;
    var lng = points[i].Longitude;
    var lat = points[i].Latitude;
    var m = markers[i];
    markerGroup.zoomToShowLayer(m, function() {
        map.setView(new L.LatLng(lat, lng), mapMaxZoom);
        m.openPopup();
    });
    var container = $("#proxiesList");
    var scrollTo = $("#" + id);
    container.scrollTop(scrollTo.offset().top - container.offset().top + container.scrollTop());
    scrollTo.css("font-weight", "bold");
    scrollTo.css("background", "#ccc");
}

//====================================================================
function updateList() {
    var pointIds = idGrouping.all();
    for (var i = 0; i < pointIds.length; i++) {
        if (pointIds[i].value > 0)
            $("#" + (i + 1)).show();
        else
            $("#" + (i + 1)).hide();
    }
}

//====================================================================
