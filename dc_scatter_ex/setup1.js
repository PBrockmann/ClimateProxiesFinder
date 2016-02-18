
//================================================================
var filter;
var fruitDimension;
var fruitGrouping;
var scatterDimension;
var scatterGrouping;

//================================================================
function init() {

d3.tsv("data.tsv", function(data) {
  
  data.forEach( function(d) {
	d.Dim1 = +d.Dim1;
	d.Dim2 = +d.Dim2;
	d.Fruit = d.Fruit;
    });
  points = data;

  initCrossfilter();
});

}

//================================================================
function initCrossfilter() {

  //-----------------------------------
  filter = crossfilter(points);

  //-----------------------------------
  fruitDimension = filter.dimension( function(d) { return d.Fruit; });
  fruitGrouping = fruitDimension.group();

  scatterDimension = filter.dimension( function(d) { 
	return [d.Dim1, d.Dim2, d.Fruit]; 
	});
  scatterGrouping = scatterDimension.group();    

  //-----------------------------------
  fruitChart  = dc.rowChart("#chart-fruit");
  scatterChart  = dc.scatterPlot("#chart-scatter");

  //-----------------------------------
  fruitColors = d3.scale.ordinal()
        .domain(["Orange", "Apple"])
   	.range(["#f09200", "#4d6f39"]);

  fruitChart
    .width(200)
    .height(200)
    .margins({top: 10, right: 10, bottom: 30, left: 10})	
    .dimension(fruitDimension)
    .group(fruitGrouping)
    .colors(fruitColors)
    .elasticX(true)
    .gap(2)
    .xAxis().ticks(4);

  //-----------------------------------
  scatterChart
    .width(380)
    .height(200)
    .margins({top: 10, right: 20, bottom: 30, left: 40})	
    .dimension(scatterDimension)
    .group(scatterGrouping)
    .x(d3.scale.linear().domain([0., 100.]))
    .y(d3.scale.linear().domain([0., 100.]))
    .renderHorizontalGridLines(true)
    .renderVerticalGridLines(true)
    .symbolSize(30)
    .highlightedSize(8)
    .existenceAccessor(function(d) { return d.value > 0; })
    .colorAccessor(function (d) { return d.key[2]; })
    .colors(fruitColors)
    .filterHandler(function(dim, filters) {
	console.log(filters);
  	if (!filters || !filters.length)
    	    dim.filter(null);
        else {
            // assume it's one RangedTwoDimensionalFilter
    	    dim.filterFunction(function(d) {
      	    	return filters[0].isFiltered([d[0],d[1]]);
            })
	}
     });


  //-----------------------------------
  dc.renderAll();

}

