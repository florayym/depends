//  ===================================================
//  =============== PARSING ===========================
//  ===================================================
// Input
// { links : [ {source: sourceName, dest : destName} * ] }
// Output:
"use strict";

var objcdv = {
    version: "0.0.1",
    _createGraph: function _createGraph() {
        return {
            nodes: [],
            links: [],
            nodesSet: {},
            node_index: 0,

            addLink: function addLink(link) {

                var source_node = this.getNode(link.source);
                source_node.source++;

                var dest_node = this.getNode(link.dest);
                dest_node.dest++;

                this.links.push({
                    // d3 js properties
                    source: source_node.idx,
                    target: dest_node.idx,

                    // Additional link information
                    sourceNode: source_node,
                    targetNode: dest_node
                });
            },

            getNode: function getNode(nodeName) {
                var node = this.nodesSet[nodeName];
                // 如果不存在，创建一个新的节点
                if (node == null) {
                    var idx = this.node_index;
                    this.nodesSet[nodeName] = node = { idx: idx, name: nodeName, source: 0, dest: 0, lines_num: 0, group: { prefix: 0, heat: 0 } }; // NOTE changed source from 1 to 0
                    this.node_index++;
                }
                return node;
            },

            updateNodes: function updateNodes(f) {
                _.values(this.nodesSet).forEach(f);
            },

            d3jsGraph: function d3jsGraph() {
                // Sorting up nodes, since, in some cases they aren't returned in correct number
                var nodes = _.values(this.nodesSet).slice(0).sort(function (a, b) {
                    return a.idx - b.idx;
                });
                return { nodes: nodes, links: this.links };
            },

            nodesStartingFromNode: function nodesStartingFromNode(node) {
                var _this = this;

                var _ref = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

                var _ref$max_level = _ref.max_level;
                var max_level = _ref$max_level === undefined ? 100 : _ref$max_level;
                var _ref$use_backward_search = _ref.use_backward_search;
                var use_backward_search = _ref$use_backward_search === undefined ? false : _ref$use_backward_search;
                var _ref$use_forward_search = _ref.use_forward_search;
                var use_forward_search = _ref$use_forward_search === undefined ? true : _ref$use_forward_search;

                // Figure out the neighboring node id's with brute strength because the graph is small
                var neighbours = {};
                neighbours[node.index] = node;

                var nodesToCheck = [node.index];
                var current_level = 0;

                var _loop = function () {
                    forwardNeighbours = [];
                    backwardNeighbours = [];

                    var tmpNeighbours = {};
                    if (use_forward_search) {
                        forwardNeighbours = _this.links.filter(function (link) {
                            return link.source.index in neighbours;
                        }).filter(function (link) {
                            return !(link.target.index in neighbours);
                        }).map(function (link) {
                            tmpNeighbours[link.target.index] = link.target;
                            return link.target.index;
                        });
                    }
                    if (use_backward_search) {
                        backwardNeighbours = _this.links.filter(function (link) {
                            return link.target.index in neighbours;
                        }).filter(function (link) {
                            return !(link.source.index in neighbours);
                        }).map(function (link) {
                            tmpNeighbours[link.source.index] = link.source;
                            return link.source.index;
                        });
                    }

                    _.extend(neighbours, tmpNeighbours);

                    nodesToCheck = forwardNeighbours.concat(backwardNeighbours);
                    console.log("Nodes to check" + nodesToCheck);

                    // Skip if we reached max level
                    current_level++;
                    if (current_level == max_level) {
                        console.log("Reached max at level" + current_level);
                        return "break";
                    }
                };

                while (Object.keys(nodesToCheck).length != 0) {
                    var forwardNeighbours;
                    var backwardNeighbours;

                    var _ret = _loop();

                    if (_ret === "break") break;
                }
                return _.values(neighbours);
            }

        };
    },
    _createPrefixes: function _createPrefixes() {
        return {
            _prefixesDistr: {},

            _sortedPrefixes: null,

            addName: function addName(name) {
                this._sortedPrefixes = null;

                var prefix = this._getPrefixName(name, color_level); // name.substring(0, 2);
                if (!(prefix in this._prefixesDistr)) {
                    this._prefixesDistr[prefix] = 1;
                } else {
                    this._prefixesDistr[prefix]++;
                }
            },

            prefixIndexForName: function prefixIndexForName(name) {
                var sortedPrefixes = this._getSortedPrefixes();
                var prefix = this._getPrefixName(name, color_level); // name.substring(0, 2);
                return _.indexOf(sortedPrefixes, prefix);
            },

            _getSortedPrefixes: function _getSortedPrefixes() {
                if (this._sortedPrefixes == null) {
                    this._sortedPrefixes = _.map(this._prefixesDistr, function (v, k) {
                        return { "key": k, "value": v };
                    }).sort(function (a, b) {
                        return b.value - a.value;
                    }).map(function (o) {
                        return o.key;
                    });
                }
                return this._sortedPrefixes;
            },

            _getPrefixName: function _getPrefixName(name, level) {

                level = level < 1 ? 1 : level;

                /* Grouping from left to right */
                // var endIndex = 0;
                // while (endIndex != -1 && level > 0) {
                //     endIndex = name.indexOf("/", endIndex + 1);
                //     level--;
                // }
                // return endIndex == -1 ? name : name.substring(0, endIndex);

                /* Select the only level-th element, counted from right to left, as the grouping condition */
                var prefix = name.split(/[\/\.]/g);
                return prefix[Math.max(prefix.length - level, 0)];

                /* Grouping from right to left */
                // var prefix = name;
                // var lastIndex = 0;
                // for (let i = 0; i < level; i++) {
                //     lastIndex = prefix.lastIndexOf("/");
                //     if (lastIndex == -1) {
                //         break;
                //     }
                //     prefix = prefix.substring(0, lastIndex);
                // }
                // prefix = name.substring(lastIndex + 1, name.length - 1);
                // return prefix;
            }
        };
    },

    _createHeatGrouping: function _createHeatGrouping() {
        return {
            color_scale: 255 * 2 - 80,
            red: 240,
            blue: 55,
            computeHeatIndex: function computeHeatIndex(heat) {
                var green_threshold = this.color_scale - this.red;
                var heat_index = Math.round((heat_max - heat) / (heat_max - heat_min) * this.color_scale);
                return heat_index <= green_threshold ? { "r": this.red, "g": heat_index, "b": this.blue }
                    : { "r": this.color_scale - heat_index, "g": green_threshold, "b": this.blue };
            }
        };
    },

    parse_dependencies_graph: function parse_dependencies_graph(dependencies) {

        var graph = this._createGraph();
        var prefixes = this._createPrefixes();
        var heat = this._createHeatGrouping();

        // get line of code
        dependencies.nodes.forEach(function (node) {
            var local_node = graph.getNode(node['name']);
            local_node.loc = node['loc'];
            local_node.heat = node['heat'];
            heat_max = Math.max(heat_max, local_node.heat);
            heat_min = Math.min(heat_min, local_node.heat);
        });

        dependencies.links.forEach(function (link) {
            graph.addLink(link);

            prefixes.addName(link.source);
            prefixes.addName(link.dest);
        });

        graph.updateNodes(function (node) {
            node.weight = node.source;
            node.group['prefix'] = prefixes.prefixIndexForName(node.name) + 1;
            node.group['heat'] = heat.computeHeatIndex(node.heat);
        });

        return graph;
    }

};

//# sourceMappingURL=parse-compiled.js.map
