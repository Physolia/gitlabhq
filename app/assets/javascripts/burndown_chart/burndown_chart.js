import d3 from 'd3';

const margin = { top: 5, right: 65, bottom: 30, left: 50 };
const parseDate = d3.time.format('%Y-%m-%d').parse;

export default class BurndownChart {
  constructor({ container, startDate, dueDate }) {
    this.canvas = d3.select(container).append('svg')
      .attr('height', '100%')
      .attr('width', '100%');

    // create svg nodes
    this.chartGroup = this.canvas.append('g').attr('class', 'chart');
    this.xAxisGroup = this.chartGroup.append('g').attr('class', 'x axis');
    this.yAxisGroup = this.chartGroup.append('g').attr('class', 'y axis');
    this.idealLinePath = this.chartGroup.append('path').attr('class', 'ideal line');
    this.actualLinePath = this.chartGroup.append('path').attr('class', 'actual line');

    this.xAxisGroup.append('line').attr('class', 'domain-line');

    // create y-axis label
    const yAxisLabel = this.yAxisGroup.append('g').attr('class', 'axis-label');
    this.yAxisLabelText = yAxisLabel.append('text').text('Remaining');
    this.yAxisLabelBBox = this.yAxisLabelText.node().getBBox();
    this.yAxisLabelLineA = yAxisLabel.append('line');
    this.yAxisLabelLineB = yAxisLabel.append('line');

    // create chart legend
    this.chartLegendGroup = this.chartGroup.append('g').attr('class', 'legend');
    this.chartLegendGroup.append('rect');

    this.chartLegendIdealKey = this.chartLegendGroup.append('g');
    this.chartLegendIdealKey.append('line').attr('class', 'ideal line');
    this.chartLegendIdealKey.append('text').text('Guideline');
    this.chartLegendIdealKeyBBox = this.chartLegendIdealKey.select('text').node().getBBox();

    this.chartLegendActualKey = this.chartLegendGroup.append('g');
    this.chartLegendActualKey.append('line').attr('class', 'actual line');
    this.chartLegendActualKey.append('text').text('Progress');
    this.chartLegendActualKeyBBox = this.chartLegendActualKey.select('text').node().getBBox();

    // parse start and due dates
    this.startDate = parseDate(startDate);
    this.dueDate = parseDate(dueDate);

    // get width and height
    const dimensions = this.canvas.node().getBoundingClientRect();
    this.width = dimensions.width;
    this.height = dimensions.height;
    this.chartWidth = this.width - (margin.left + margin.right);
    this.chartHeight = this.height - (margin.top + margin.bottom);

    // set default scale domains
    this.xMax = this.dueDate;
    this.yMax = 1;

    // create scales
    this.xScale = d3.time.scale()
      .range([0, this.chartWidth])
      .domain([this.startDate, this.xMax]);

    this.yScale = d3.scale.linear()
      .range([this.chartHeight, 0])
      .domain([0, this.yMax]);

    // create axes
    this.xAxis = d3.svg.axis()
      .scale(this.xScale)
      .orient('bottom')
      .tickFormat(d3.time.format('%b %-d'))
      .tickPadding(6)
      .tickSize(4, 0);

    this.yAxis = d3.svg.axis()
      .scale(this.yScale)
      .orient('left')
      .tickPadding(6)
      .tickSize(4, 0);

    // create lines
    this.line = d3.svg.line()
      .x(d => this.xScale(d.date))
      .y(d => this.yScale(d.value));

    // render the chart
    this.queueRender();
  }

  // set data and force re-render
  setData(data, label) {
    this.data = data.map(datum => ({
      date: parseDate(datum[0]),
      value: parseInt(datum[1], 10),
    })).sort((a, b) => (a.date - b.date));

    // adjust axis domain to correspond with data
    this.xMax = Math.max(d3.max(this.data, d => d.date) || 0, this.dueDate);
    this.yMax = d3.max(this.data, d => d.value) || 1;

    this.xScale.domain([this.startDate, this.xMax]);
    this.yScale.domain([0, this.yMax]);

    // calculate the bounding box for our axis label if we've updated it
    // (we must do this here to prevent layout thrashing)
    if (label !== undefined) {
      this.yAxisLabelBBox = this.yAxisLabelText.text(label).node().getBBox();
    }

    // set our ideal line data
    if (this.data.length > 1) {
      const idealStart = this.data[0] || { date: this.startDate, value: 0 };
      const idealEnd = { date: this.dueDate, value: 0 };
      this.idealData = [idealStart, idealEnd];
    }

    this.queueRender();
  }

  // reset width and height to match the svg element, then re-render if necessary
  resize() {
    const dimensions = this.canvas.node().getBoundingClientRect();
    if (this.width !== dimensions.width || this.height !== dimensions.height) {
      this.width = dimensions.width;
      this.height = dimensions.height;

      // adjust axis range to correspond with chart size
      this.chartWidth = this.width - (margin.left + margin.right);
      this.chartHeight = this.height - (margin.top + margin.bottom);

      this.xScale.range([0, this.chartWidth]);
      this.yScale.range([this.chartHeight, 0]);

      this.queueRender();
    }
  }

  render() {
    this.queuedRender = null;

    this.xAxis.ticks(Math.floor(this.chartWidth / 120));
    this.yAxis.ticks(Math.min(Math.floor(this.chartHeight / 60), this.yMax));

    this.chartGroup.attr('transform', `translate(${margin.left}, ${margin.top})`);
    this.xAxisGroup.attr('transform', `translate(0, ${this.chartHeight})`);

    this.xAxisGroup.call(this.xAxis);
    this.yAxisGroup.call(this.yAxis);

    // replace x-axis line with one which continues into the right margin
    this.xAxisGroup.select('.domain').remove();
    this.xAxisGroup.select('.domain-line').attr('x1', 0).attr('x2', this.chartWidth + margin.right);

    // update our y-axis label
    const axisLabelOffset = (this.yAxisLabelBBox.height / 2) - margin.left;
    const axisLabelPadding = (this.chartHeight - this.yAxisLabelBBox.width - 10) / 2;

    this.yAxisLabelText
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (this.chartHeight / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .attr('transform', 'rotate(-90)');
    this.yAxisLabelLineA
      .attr('x1', axisLabelOffset)
      .attr('x2', axisLabelOffset)
      .attr('y1', 0)
      .attr('y2', axisLabelPadding);
    this.yAxisLabelLineB
      .attr('x1', axisLabelOffset)
      .attr('x2', axisLabelOffset)
      .attr('y1', this.chartHeight - axisLabelPadding)
      .attr('y2', this.chartHeight);

    // update our legend
    const legendPadding = 10;
    const legendSpacing = 5;

    const idealBBox = this.chartLegendIdealKeyBBox;
    const actualBBox = this.chartLegendActualKeyBBox;
    const keyWidth = Math.ceil(Math.max(idealBBox.width, actualBBox.width));
    const keyHeight = Math.ceil(Math.max(idealBBox.height, actualBBox.height));

    const idealKeyOffset = legendPadding;
    const actualKeyOffset = legendPadding + keyHeight + legendSpacing;
    const legendWidth = (legendPadding * 2) + 24 + keyWidth;
    const legendHeight = (legendPadding * 2) + (keyHeight * 2) + legendSpacing;
    const legendOffset = (this.chartWidth + margin.right) - legendWidth - 1;

    this.chartLegendGroup.select('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight);

    this.chartLegendGroup.selectAll('text')
      .attr('x', 24)
      .attr('dy', '1em');
    this.chartLegendGroup.selectAll('line')
      .attr('y1', keyHeight / 2)
      .attr('y2', keyHeight / 2)
      .attr('x1', 0)
      .attr('x2', 18);

    this.chartLegendGroup.attr('transform', `translate(${legendOffset}, 0)`);
    this.chartLegendIdealKey.attr('transform', `translate(${legendPadding}, ${idealKeyOffset})`);
    this.chartLegendActualKey.attr('transform', `translate(${legendPadding}, ${actualKeyOffset})`);

    // render lines if data available
    if (this.data != null && this.data.length > 1) {
      this.actualLinePath.datum(this.data).attr('d', this.line);
      this.idealLinePath.datum(this.idealData).attr('d', this.line);
    }
  }

  queueRender() {
    this.queuedRender = this.queuedRender || requestAnimationFrame(() => this.render());
  }

  animate(seconds = 5) {
    this.ticksLeft = this.ticksLeft || 0;
    if (this.ticksLeft <= 0) {
      const interval = setInterval(() => {
        this.ticksLeft -= 1;
        if (this.ticksLeft <= 0) {
          clearInterval(interval);
        }
        this.resize();
      }, 20);
    }
    this.ticksLeft = seconds * 50;
  }
}
