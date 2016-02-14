
//================================================================
var filter;
var depthDimension;
var depthGrouping;

//================================================================
function init() {

d3.tsv("depth.tsv", function(data) {
  data.forEach(function(d) {
	d.Depth = +d.Depth;
  });
  points=data;

  initCrossfilter();
});

}

//================================================================
function initCrossfilter() {

  //-----------------------------------
  filter = crossfilter(points);

  //-----------------------------------
  depthRange = [0., 5000.];
  depthBinWidth = 500.;
  depthDimension = filter.dimension( function(d) { 
	return d.Depth;
    });
  depthGrouping = depthDimension.group( function(d) {
	// Threshold
	var depthThresholded = d;
	if (depthThresholded <= depthRange[0]) depthThresholded = depthRange[0];
	if (depthThresholded >= depthRange[1]) depthThresholded = depthRange[1] - depthBinWidth;
	return depthBinWidth*Math.floor(depthThresholded/depthBinWidth);
      });

  //-----------------------------------
  depthChart  = dc.barChart("#chart-depth");
  dataTable  = dc.dataTable("#dataTable");

  //-----------------------------------
  depthChart
    .width(380)
    .height(200)
    .margins({top: 10, right: 20, bottom: 30, left: 30})	
    .centerBar(false)
    .elasticY(true)
    .dimension(depthDimension)
    .group(depthGrouping)
    .x(d3.scale.linear().domain(depthRange))
    .xUnits(dc.units.fp.precision(depthBinWidth))
    .round(function(d) {return depthBinWidth*Math.floor(d/depthBinWidth)})
    .renderHorizontalGridLines(true);

  xAxis_depthChart = depthChart.xAxis();
  xAxis_depthChart.ticks(6).tickFormat(d3.format("d"));
  yAxis_depthChart = depthChart.yAxis();
  yAxis_depthChart.ticks(6).tickFormat(d3.format("d")).tickSubdivide(0);		// tickSubdivide(0) should remove sub ticks but not

  //-----------------------------------
  dataTable
    .dimension(depthDimension)
    .group(function (d) {
            return d.Id + "   " + d.Depth;                        // Data table does not use crossfilter group but rather a closure as a grouping function
        })
    .size(30);

  //-----------------------------------
  dc.renderAll();

}

