
//====================================================================
var map;
var mapMaxZoom = 6;

var markers = [] ;
var markerGroup ;

var grat;

var xf;
var depthDim;
var depthGroup;
var ageDim;
var ageGroup;
var archiveDim;
var archiveGroup;
var materialDim;
var materialGroup;

var  Ice_color = "#008cb2";
var  Lake_color = "#314f6f";
var  Ocean_color = "#81a6d3";
var  Speleothem_color = "#afa393";
var  Tree_color = "#568e14";
var  Carbonate_color = "#ff0000";
var  NonCarbonate_color = "#903373";
var  Cellulose_color = Tree_color;
var  Coral_color = "#ff7f50";
var  PlanktonicForaminifera_color = Ocean_color;
var  BenthicForaminifera_color = Ocean_color;
var  Unkown_color = "#FF4400";
var  Others_color = "#FF4400";

myIcon = L.icon({
    iconUrl: 'LSCE_Icon.png',
    iconSize: [20, 20], 
    iconAnchor: [10, 0] 
});

//====================================================================
function init() {

//-----------------------------------------
d3.tsv("proxies_select.tsv", function(data) {
//d3.tsv("proxies.tsv", function(data) {
  data.forEach(function(d) {
        d.Longitude = +d.Longitude;
        d.Latitude = +d.Latitude;
        d.Depth = +d.Depth;
        d.OldestDate = +d.OldestDate;
        d.RecentDate = +d.RecentDate;

	// Limit latitudes according to latitude map range (-85:85)
        if (d.Latitude < -85) d.Latitude = -85;
        if (d.Latitude > 85) d.Latitude = 85;
  });

  initCrossfilter(data);

  // Render the total.
  d3.selectAll("#total").text(xf.size());

//-----------------------------------------
});

}



//====================================================================
function initCrossfilter(data) {

  //-----------------------------------
  xf = crossfilter(data);

  //-----------------------------------
  depthRange = [0., 5000.];
  depthBinWidth = 100.;
  depthDim = xf.dimension( function(d) { 
	// Threshold
	var depthThresholded = d.Depth;
	if (depthThresholded <= depthRange[0]) depthThresholded = depthRange[0];
	if (depthThresholded >= depthRange[1]) depthThresholded = depthRange[1] - depthBinWidth;
	return depthBinWidth*Math.floor(depthThresholded/depthBinWidth);
      });
  depthGroup = depthDim.group();

  //-----------------------------------
  age1Range = [-2.5, 50.];
  age2Range = [-2.5, 50.];
  ageBinWidth = 1.;
  ageDim = xf.dimension( function(d) {
	// Threshold
	var age1Thresholded = d.RecentDate;
	if (age1Thresholded <= age1Range[0]) age1Thresholded = age1Range[0];
	if (age1Thresholded >= age1Range[1]) age1Thresholded = age1Range[1] - ageBinWidth;
	var age1 = ageBinWidth*Math.floor(age1Thresholded/ageBinWidth);
	var age2Thresholded = d.OldestDate;
	if (age2Thresholded <= age2Range[0]) age2Thresholded = age2Range[0];
	if (age2Thresholded >= age2Range[1]) age2Thresholded = age2Range[1] - ageBinWidth;
	var age2 = ageBinWidth*Math.floor(age2Thresholded/ageBinWidth);
        return [age2, age1, d.Archive];
      });
  ageGroup = ageDim.group();

  //-----------------------------------
  archiveDim = xf.dimension( function(d) { return d.Archive; });
  archiveGroup = archiveDim.group();

  //-----------------------------------
  materialDim = xf.dimension( function(d) { return d.Material; });
  materialGroup = materialDim.group();

  //-----------------------------------
  // mapDim = xf.dimension(function(d) { return [d.Latitude, d.Longitude]; });
  // mapGroup = mapDim.group();

  //add Id to group for map popup window
  mapDimPopup = xf.dimension(function(d) { return [d.Latitude, d.Longitude, d.Id]; });
  mapGroupPopup = mapDimPopup.group();

  //-----------------------------------
  tableIdDimension = xf.dimension(function(d) {
    return +d.Id;
  });

  //-----------------------------------
  mapChart  = dc.leafletMarkerChart("#chart-map");

  mapChart
      .width(1000)
      .height(300)
      .dimension(mapDimPopup)
      .group(mapGroupPopup)
      .center([0,0])
      .mapOptions({maxZoom: mapMaxZoom})
      .zoom(1)
      .filterByArea(true)
      .cluster(true) 
      .clusterOptions({maxClusterRadius: 50, showCoverageOnHover: false, spiderfyOnMaxZoom: true})
      .icon(function() {
		    return myIcon;
      })
      .popup(function (d) {
        
        id = d.key[2];
        // console.log("d.key[2]: ", id)
        // console.log("data: ", data)
        // console.log("data[id]: ", data[id - 1])
        // console.log("data[id].Id: ", data[id - 1].Id)
        // console.log("mapDim.top: ", mapDim.top(Infinity))
        // console.log("mapDimPopup.top: ", mapDimPopup.top(Infinity))

    		return  "Id: " + "<b>" + data[id - 1].Id + "</b></br>"
    		+ "Position: " + "<b>" + data[id - 1].Longitude.toFixed(2) + "°E</b>, <b>" + data[id - 1].Latitude.toFixed(2) + "°N</b></br>"
    		+ "Depth (m): " + "<span style='color: " + Ocean_color + ";'><b>" +  data[id - 1].Depth.toFixed(2) + "</b></span></br>"
    		+ "Date (ka): " + "<span style='color: #C9840B;'>" + "from <b>" + data[id - 1].RecentDate.toFixed(2) + "</b> to <b>" + data[id - 1].OldestDate.toFixed(2) + "</b></span></br>"
    		+ "Archive: " + "<b>" + data[id - 1].Archive + "</b></br>"
    		+ "Material: " + "<b>" + data[id - 1].Material + "</b></br>";
       })
      .label(function (d) {
        console.log("label d: ", d)
      });



  //-----------------------------------
  depthChart  = dc.barChart("#chart-depth");

  depthChart
    .width(380)
    .height(200)
    .margins({top: 10, right: 20, bottom: 30, left: 40})	
    .centerBar(false)
    .elasticY(true)
    .dimension(depthDim)
    .group(depthGroup)
    //.on("preRedraw", update0)
    .x(d3.scale.linear().domain(depthRange))
    .xUnits(dc.units.fp.precision(depthBinWidth))
    .round(function(d) {return depthBinWidth*Math.floor(d/depthBinWidth)})
    .gap(0)
    .renderHorizontalGridLines(true)
    .colors(Ocean_color);

  xAxis_depthChart = depthChart.xAxis();
  xAxis_depthChart.ticks(6).tickFormat(d3.format("d"));
  yAxis_depthChart = depthChart.yAxis();
  yAxis_depthChart.tickFormat(d3.format("d")).tickSubdivide(0);

  //-----------------------------------
  var archiveColors = d3.scale.ordinal()
        .domain(["Ice", "Lake", "Ocean", "Speleothem", "Tree"])
   	.range([Ice_color, Lake_color, Ocean_color, Speleothem_color, Tree_color]);

  ageChart  = dc.scatterPlot("#chart-age");

  ageChart
    .width(380)
    .height(200)
    .margins({top: 10, right: 20, bottom: 30, left: 40})	
    .dimension(ageDim)
    .group(ageGroup)
    .xAxisLabel("Most recent age")
    .yAxisLabel("Oldest age")
    //.on("preRedraw", update0)
    //.mouseZoomable(true)
    .x(d3.scale.linear().domain(age1Range))
    .y(d3.scale.linear().domain(age2Range))
    .round(function(d) {return ageBinWidth*Math.floor(d/ageBinWidth)})
    .renderHorizontalGridLines(true)
    .renderVerticalGridLines(true)
    .symbolSize(8)
    .highlightedSize(8)
    .existenceAccessor(function(d) { return d.value > 0 ; })
    .colorAccessor(function (d) { return d.key[2]; })
    .colors(archiveColors)
    .filterHandler(function(dim, filters) {
  	if(!filters || !filters.length)
    		dim.filter(null);
    	else {
      	// assume it's one RangedTwoDimensionalFilter
    	dim.filterFunction(function(d) {
      		return filters[0].isFiltered([d[0],d[1]]);
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
  archiveChart  = dc.rowChart("#chart-archive");

  archiveChart
    .width(180)
    .height(200)
    .margins({top: 10, right: 10, bottom: 30, left: 10})	
    .dimension(archiveDim)
    .group(archiveGroup)
    //.on("preRedraw", update0)
    .colors(archiveColors)
    .elasticX(true)
    .gap(2)
    .xAxis().ticks(4);

  //-----------------------------------
  var newOrderMaterial = {
		      "Carbonate": 1, 
		      "Non-Carbonate": 2,
		      "Cellulose": 3,
		      "Coral": 4,
		      "Benthic foraminifera": 5,
		      "Planktonic foraminifera": 6,
		      "Ice": 7,
		      "Speleothem": 8,
                      "Others": 9, 
                      "Unknown": 10 };
  var materialColors = d3.scale.ordinal()
        .domain(["Carbonate", "Non-Carbonate", "Cellulose", "Coral", "Benthic foraminifera",
		 "Planktonic foraminifera", "Ice", "Speleothem", "Others", "Unknown" ])
   	.range([Carbonate_color, NonCarbonate_color, Cellulose_color, Coral_color, BenthicForaminifera_color,
		PlanktonicForaminifera_color, Ice_color, Speleothem_color, Others_color, Unkown_color]);

  materialChart  = dc.rowChart("#chart-material");

  materialChart
    .width(180)
    .height(200)
    .margins({top: 10, right: 10, bottom: 30, left: 10})	
    .dimension(materialDim)
    .group(materialGroup)
    //.on("preRedraw", update0)
    .colors(materialColors) 
    .elasticX(true)
    .gap(2)
    .ordering(function (d) { return newOrderMaterial[d.key]; })
    .xAxis().ticks(4);

  //-----------------------------------
  dataTable = dc.dataTable("#dcTable");

  dataTable
    .width(1060)
    .height(800)
    .dimension(tableIdDimension)
    .group(function(d) { return "Proxies Table"})
    .size(6)
    //.size(csv.length) //display all data
    .columns([
      function(d) { return d.Id; },
      function(d) { return d.Depth; },
      function(d) { return d.RecentDate; },
      function(d) { return d.OldestDate; },
      function(d) { return d.Archive; },
      function(d) { return d.Material; },
      function(d) { return d.DOI; },
      function(d) { return d.Reference; }                  
    ])
    .sortBy(function(d){ return +d.Id; })
    .order(d3.ascending);

  // ADD INTERACTIVE FUNCTIONALITY FOR DC TABLE    

  // Add ellipses for long entries and make DOI a hyperlink to google scholar
  //http://stackoverflow.com/questions/5474871/html-how-can-i-show-tooltip-only-when-ellipsis-is-activated
  $('#dcTable').on('mouseover', '.dc-table-column', function() {      

    var $this = $(this);

    // always displays popup for DOI and Reference columns
    // if (d3.select(this).attr("class") === "dc-table-column _7" || 
    //     d3.select(this).attr("class") === "dc-table-column _6") {
    //   $this.attr('title', $this.text());
    // }

    // displays popup only if text does not fit in col width
    if (this.offsetWidth < this.scrollWidth) {
      $this.attr('title', $this.text());
    }

    // change DOI colour to blue to indicate hyperlink
    if (d3.select(this).attr("class") === "dc-table-column _6") {
      d3.select(this).style("color", "#0645AD");
    }
  })

  // Reset DOI colour to default
  $('#dcTable').on('mouseout', '.dc-table-column', function() {
    if (d3.select(this).attr("class") === "dc-table-column _6") {
      d3.select(this).style("color", "#333");
    }
  })

  // Make DOI a hyperlink to google scholar
  $('#dcTable').on('click', '.dc-table-column', function() {
    if (d3.select(this).attr("class") === "dc-table-column _6") {
      console.log("DOI", d3.select(this).text())
      window.open("https://scholar.google.fr/scholar?q=" + d3.select(this).text());
    }
  })

  // Bind dcTable to other dc charts when row is clicked
  //http://stackoverflow.com/questions/21113513/reorder-datatable-by-column/21116676#21116676
  $('#dcTable').on('click', '.dc-table-row', function() {
    var id = d3.select(this).select(".dc-table-column._0").text();

    tableIdDimension.filter(id);

    //console.log("tableIdDimension: ", tableIdDimension.top(Infinity))
    dataTable.dimension(tableIdDimension) 
    dataTable.redraw();
    dc.redrawAll();

    // make reset link visible
    d3.select("#resetTableLink").style("display", "inline")

  });


  //-----------------------------------
  dc.renderAll();

}



//====================================================================
// reset dcTable
function resetTable() {
  tableIdDimension.dispose(); //important! table dim will not be updated without it
  tableIdDimension = xf.dimension(function(d) {
    return +d.Id;
  });

  dataTable.dimension(tableIdDimension) 
  dataTable.redraw();
  dc.redrawAll();

  // make reset link invisible
  d3.select("#resetTableLink").style("display", "none")

}