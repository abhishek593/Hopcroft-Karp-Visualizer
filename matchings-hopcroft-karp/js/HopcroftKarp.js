/**
 * Instanz des Hopcroft-Karp Algorithmus, erweitert die Klasse CanvasDrawer
 * @constructor
 * @augments GraphDrawer
 */
function HopcroftKarp(svgSelection) {
	GraphDrawer.call(this,svgSelection);

	/**
     * closure for this class
	 * @type HopcroftKarp
	 */
    var that = this;
    
    /**
     * Hier werden die Statuskonstanten definiert
     */
    const ALGOINIT = 0;
    const BEGIN_ITERATION = 1;
    const END_ITERATION = 2;
    const NEXT_AUGMENTING_PATH = 3;
    const UPDATE_MATCHING = 4;
    const GRAY_PATH = 5;
    const END_ALGORITHM = 6;
    const SHOW_BFS_TREE = 7;

    /**
     * Enthaelt alle Kanten, die zu aktuellem Zeitpunkt zum Matching gehoeren.
     * Keys: KantenIDs Value: Kanten
     * @type Object
     */
    var matching = new Object();
    /*
    * Repraesentiert den Augmentierungsgraphen.
    * @type Object
    * */
    var bfsEdges = new Object();
    /*
     * Die Laenge des kuerzesten verbessernden Pfades in der aktuellen Iteration.
     * @type Number
     * */
    var shortestPathLength = 0;
    /*
    * Enthaelt die Matching-Partner der Knoten.
    * Keys: KnotenIDs Value: Knoten
    * @type Object
    * */
    var matched = new Object();
    /*
    * Enthaelt die disjunkten augmentierenden Pfade der aktuellen Iteration.
    * Die Pfade sehen wie folgt aus: v1,e1,v2,...,en-1,vn.
    * Dabei bezeichnen vi Knoten und ei Kanten
    * @type Array
    * */
    var disjointPaths = new Array();
    /*
    * Der Pfad, der aktuell bearbeitet wird.
    * @type Number
    * */
    var currentPath = 0;

    /**
     * Zählt die Phasen / Runden.
     * @type Number
     */
    var iteration = 0;
    /**
     * Wird fuer die Anzeige des Matchings am Ende des Algorithmus benoetigt.
     * @type Boolean
     */
    var toggleMatchButton = true;
    /**
     * Gibt den Kontext des Ausgabefensters an.
     * @type String
     */
    var st = "ta";
    /**
     * Gibt das Statusausgabefenster an.
     * @type String
     */
    var statusErklaerung = "#"+st+"_div_statusErklaerung";
    
    /**
     * the logger instance
     * @type Logger
     */
    var logger = new Logger(d3.select("#logger"));

    /**
     * status variables
     * @type Object
     */
    var s = null;

    /**
     * Storing nodes for bfs tree
     * @type {2d array}
     */
    var bfs_levels = null;

    /**
     * Storing edges of bfs tree as adjacency list
     * @type {array}
     */
    var bfs_edges = null;

    /*
    * Alle benoetigten Information zur Wiederherstellung der vorangegangenen Schritte werden hier gespeichert.
    * @type Array
    * */
    var history = new Array();

    /**
     * Initialisiert das Zeichenfeld
     * @method
     */
    this.init = function() {
        Graph.addChangeListener(function(){
            that.clear();
            that.reset();
            that.squeeze();
            that.update();
        });

        this.reset();
        this.update();
    };

    /**
     * clear all states
     */
    this.reset = function(){
        s = {
            id: 0
        };

        matching = new Object();
        bfsEdges = new Object();
        shortestPathLength = 0;
        matched = new Object();
        disjointPaths = new Array();
        currentPath = 0;
        iteration = 0;
        toggleMatchButton = true;

        logger.data = [];
        history = [];

        if(Graph.instance) {
            Graph.instance.nodes.forEach(function(key, node) {
                node.state.color = const_Colors.NodeFilling;
                node.state.strokeColor = global_NodeLayout.borderColor;
                node.state.strokeWidth = global_NodeLayout.borderWidth;
            })

            Graph.instance.edges.forEach(function(key, edge) {
                edge.state.color = global_Edgelayout.lineColor;
                edge.state.width = global_Edgelayout.lineWidth;
                edge.state.dashed = false;
            })
        }
    }

    /**
     * Makes the view consistent with the state
     * @method
     */
    this.update = function(){

        this.updateDescriptionAndPseudocode();
        logger.update();

        if(Graph.instance){
             HopcroftKarp.prototype.update.call(this); //updates the graph
        }
    }

    /**
     * When Tab comes into view
     * @method
     */
    this.activate = function() {   
        $(statusErklaerung).html("<h3>" + LNG.K('textdb_msg_init') + "</h3><p>" + LNG.K('textdb_msg_init_1') + "</p><p>" + 
            LNG.K('textdb_msg_init_2') + "</p><p>" + LNG.K('textdb_msg_init_3') + "</p><p>" + LNG.K('textdb_msg_init_4') + "</p><p>" +
            LNG.K('textdb_msg_init_5') + "</p>");
        this.reset();
        this.squeeze();
        this.update();
    };

    /**
     * tab disappears from view
     * @method
     */
    this.deactivate = function() {
        this.stopFastForward();
        this.reset();
        Graph.instance = null;
        Graph.instance2 = null;
        // load selected graph again 
        Graph.setGraph("tg");
    };

    this.getWarnBeforeLeave = function() {
        return s.id != 0 && s.id != 8;
    }
    
    
    this.setDisabledBackward = function(disabled) {
        $("#ta_button_Zurueck").button("option", "disabled", disabled);
    };
    
    this.setDisabledForward = function(disabled, disabledSpulen) {
        var disabledSpulen = (disabledSpulen!==undefined) ? disabledSpulen : disabled;
        $("#ta_button_1Schritt").button("option", "disabled", disabled);
        $("#ta_button_vorspulen").button("option", "disabled", disabledSpulen);
    };

    /**
     * Zeigt and, in welchem Zustand sich der Algorithmus im Moment befindet.
     * @returns {Number} StatusID des Algorithmus
     */
    this.getStatusID = function() {
        return s.id;
    };

     /**
     * Ermittelt basierend den vorherigen Schritt
     * und ruft die entsprechende Funktion auf.
     * @method
     */
    this.previousStepChoice = function() {
        this.replayStep();
        this.update();
    };

    /**
     * Erstellt ein history-Objekt, damit Aenderungen eines Schritts rueckgaengiggemacht werden koennen.
     * @method
     */
    this.addReplayStep = function() {
        var nodeColors = {};
        var nodeStrokeColors = {};
        var nodeStrokeWidths = {};
        var edgeColors = {};
        var edgeWidths = {};
        Graph.instance.nodes.forEach ( function(nodeID, node) {
            nodeColors[nodeID] = node.state.color;
            nodeStrokeColors[nodeID] = node.state.strokeColor;
            nodeStrokeWidths[nodeID] = node.state.strokeWidth;
        });
        Graph.instance.edges.forEach ( function(edgeID, edge) {
            edgeColors[edgeID] = edge.state.color;
            edgeWidths[edgeID] = edge.state.width;
        });
        history.push({
            "previousStatusId": s.id,
            "nodeColors": nodeColors,
            "nodeStrokeColors": nodeStrokeColors,
            "nodeStrokeWidths": nodeStrokeWidths,
            "edgeColors": edgeColors,
            "edgeWidths": edgeWidths,
            "matching": jQuery.extend({},matching),
            "bfsEdges": jQuery.extend({},bfsEdges),
            "shortestPathLength": shortestPathLength,
            "iteration": iteration,
            //"superNode": jQuery.extend({},superNode),
            "matched": jQuery.extend({},matched),
            "disjointPaths": jQuery.extend([],disjointPaths),
            "currentPath": currentPath,
            "htmlSidebar": $(statusErklaerung).html()
        });
        //console.log("Current History Step: ", history[history.length-1]);
    };

    /**
     * Benutzt das letzte history-Objekt, um die Aenderungen des letzten Schritts rueckgaengig zu machen.
     * @method
     */
    this.replayStep = function() {
        if(history.length > 0){
            var oldState = history.pop();
            //console.log("Replay Step", oldState);
            s.id = oldState.previousStatusId;
            matching = oldState.matching;
            bfsEdges = oldState.bfsEdges;
            shortestPathLength = oldState.shortestPathLength;
            iteration = oldState.iteration;
            //superNode = oldState.superNode;
            matched = oldState.matched;
            disjointPaths = oldState.disjointPaths;
            currentPath = oldState.currentPath;
            $("#"+st+"_div_statusErklaerung").html(oldState.htmlSidebar);
            for(var key in oldState.nodeColors) {
                Graph.instance.nodes.get(key).state.color = oldState.nodeColors[key];
            }
            for(var key in oldState.nodeStrokeColors) {
                Graph.instance.nodes.get(key).state.strokeColor = oldState.nodeStrokeColors[key];
            }
            for(var key in oldState.nodeStrokeWidths) {
                Graph.instance.nodes.get(key).state.strokeWidth = oldState.nodeStrokeWidths[key];
            }
            for(var key in oldState.edgeColors) {
                Graph.instance.edges.get(key).state.color = oldState.edgeColors[key];
            }
            for(var key in oldState.edgeWidths) {
                Graph.instance.edges.get(key).state.width = oldState.edgeWidths[key];
            }
        }
    };


    /**
     * Executes the next step in the algorithm
     * @method
     */
    this.nextStepChoice = function(d) {

        // Store current state of the algorithm.
        this.addReplayStep();
        switch (s.id) {
            case ALGOINIT:
                this.initialize();
                break;
            case BEGIN_ITERATION:
                this.beginIteration();
                break;
            case END_ITERATION:
                this.endIteration();
                break;
            case NEXT_AUGMENTING_PATH:
                this.highlightPath(disjointPaths[currentPath]);
                break;
            case UPDATE_MATCHING:
                this.augmentMatching(disjointPaths[currentPath]);
                break;
            case GRAY_PATH:
                this.hidePath(disjointPaths[currentPath]);
                break;
            case SHOW_BFS_TREE:
                this.updateBfsTree([]);
                break;
            case END_ALGORITHM:
                this.endAlgorithm();
                break;
            default:
                //console.log("Fehlerhafte StatusID.");
                break;
        }

        // update view depending on the current state
        this.update();
    };


    /*
    * Updating the $$BFStree
    * @method -- to implement
    */
    this.updateBfsTree = function (branches) {        
        // Graph.instance.addBFSNode(100, 200, [])
        var l = 0;
        var posX = 100;
        var posY = 400;
        var shiftX = 100;
        var shiftY = 100;
        var mtoBFS = new Object();
        for(var n in bfs_levels){
            var c = 0;
            for(var cur in bfs_levels[n]) {
                var nid = bfs_levels[n][cur];
                // make another node corresponding to nid
                var nnode = Graph.instance.addBFSNode(posX + (c++)*shiftX, posY - l*shiftY,[]);
                mtoBFS[nid] = nnode.id;
            }
            l++;
        }

        var edid = Graph.instance.getMaxEdgeId();
        for(var e in bfs_edges) {
            edge = bfs_edges[e];
            console.log(mtoBFS[edge[0]]);
            var nedge = Graph.instance.addBFSEdge(mtoBFS[edge[0]], mtoBFS[edge[1]], edid++);
        }

        this.update();
        
        // work on this function
        s.id = END_ALGORITHM;
        $(statusErklaerung).html("<h3> "+LNG.K('textdb_msg_end_algo')+"</h3>"
            + "<p>"+LNG.K('textdb_msg_end_algo_1')+"</p>");
    };

    /*
     * Develop bfs tree
     * @param bfsEdges Adjacency matrix
     * @param supernode Starting nodes
     * @method
     */
    var developBFStree = function (bfsEdges, superNode) {
        var layers = [];
        var edges = [];
        var examined = {};
        Graph.instance.nodes.forEach( function(knotenID, knoten) {
            examined[knotenID] = false;
        });

        // console.log(superNode)
        // for (var n = 0; n <=3; n++) {
        //     console.log(n)
        //     console.log(bfsEdges[n]);
        // }

        var curLayer = [];
        var nextLayer = [];
        for (var free in superNode) {
            curLayer.push(superNode[free].id);
        }
        curLayer = [...new Set(curLayer)];
        while(curLayer.length > 0) {
            // console.log(curLayer)
            layers.push(curLayer)
            nextLayer = [];
            for(let n in curLayer) {
                nid = curLayer[n]
                examined[nid] = true;
                for(var c in bfsEdges[nid]){
                    c = parseInt(c)
                    if(!examined[c]) {
                        edges.push([nid, c]);
                        nextLayer.push(c);
                    }
                }
            }
            curLayer = [...new Set(nextLayer)];
        }

        // console.log(layers)
        // console.log(edges)
        // Graph.instance.bfsnodes = layers
        // Graph.instance.bfsEdgeList = edges


        bfs_levels = layers;
        bfs_edges = edges;
    }

    /*
    * Mit Hilfe der Breitensuche wird ein Augmentationsgraph aufgebaut, der die kuerzesten Augmentationswege enthaelt.
    * @param {Object} superNode   Startknoten fuer die Breitensuche.
    * @method
    * */
    var bfs = function (superNode) {
        //Initialize
        var freeNodeFound = false;
        var emptyLayer = false;
        var evenLayer = {};
        var oddLayer = {};
        var examined = {};
        shortestPathLength = 0;
        Graph.instance.nodes.forEach( function(knotenID, knoten) {
            examined[knotenID] = false;
            bfsEdges[knotenID] = {};
        });
        for (var free in superNode) {
            evenLayer[free] = superNode[free];
        }
        //Iterate
        while (!freeNodeFound && !emptyLayer) {
            shortestPathLength++;
            for (n in evenLayer) {
                var node = evenLayer[n];
                examined[node.id] = true;
                //find all adjacent edges
                var edges = node.getOutEdges();
/*                var inEdges = node.getInEdges();
                for (var e in inEdges) {edges[e] = inEdges[e];}*/
                //try all the found edges
                for (var e in edges) {
                    var edge = edges[e];
                    var adj = edge.end.id;
                    if (!examined[adj]) {
                        bfsEdges[node.id][adj] = edge;
                        if(!oddLayer.hasOwnProperty(adj)) oddLayer[adj] = Graph.instance.nodes.get(adj); //if not already in the oddLayer then insert
                        if (!matched[adj]) freeNodeFound = true; // if unmatched we found the shortest path
                    }
                }
            }
            if (freeNodeFound) {
                for (var ind in evenLayer) {
                    var node = evenLayer[ind];
                    var children = bfsEdges[node.id];
                    for (n in children) {
                        if (matched[n]) {
                            delete children[n];
                        }
                    }
                }
            }
            else if (!Object.keys(oddLayer).length) { // oddLayer is empty
                emptyLayer = true;
                shortestPathLength = 0;
            }
            else {
                evenLayer = {};
                for(var n in oddLayer){
                    var node = oddLayer[n];
                    var partner = matched[node.id];
                    var edge = Graph.instance.edges.get(Graph.instance.getEdgeBetween(partner,node));
                    bfsEdges[node.id][partner.id] = edge;
                    evenLayer[partner.id] = partner;
                    examined[node.id] = true;
                }
                oddLayer = {};
                shortestPathLength++;
            }
        }
    };

    /*
    * Mittels der Tiefensuche wird nach knotendisjunkten Augmantationswegen gesucht. Dabei wird der Augmentierungsgraph aus der Bfs-Phase verwendet.
    * @param {Object} superNode   Startknoten fuer die Tiefensuche
    * @method
    * */
   var dfs = function(superNode){
       var dfsStack = [];
       for (var node in superNode) {
           var foundAugmentingPath = recursiveDfs(superNode[node], dfsStack);
           if (foundAugmentingPath){ //delete the edges of nodes in stack from the graph to ensure disjunct paths
               for (var i = 0; i < dfsStack.length; i=i+2) { //iterate only over the nodes in path
                   var curr = dfsStack[i];
                   var parents = curr.getInEdges();
                   for (var e in parents) {
                       var pid = parents[e].start.id;
                       delete bfsEdges[pid][curr.id];
                   }
                   parents = curr.getOutEdges();
                   for (var e in parents) {
                       var pid = parents[e].end.id;
                       delete bfsEdges[pid][curr.id];
                   }
               }
               delete superNode[node];
               disjointPaths.push(dfsStack);
           }
           dfsStack = [];
       }
   };
    /*
    * Rekursives Unterprogramm, das fuer die Tiefensuche benutzt wird.
    * @param {Object} node   Der aktuelle Knoten
    * @param {Object} stack   Der aufgebaute Stack
    * @method
    * */
   var recursiveDfs = function (node, stack) {
        stack.push(node);
        if (!matched[node.id] && stack.length>1) return true;
        else {
            var children = bfsEdges[node.id];
            for (var c in children) {
                stack.push(children[c]);
                if (recursiveDfs(Graph.instance.nodes.get(c), stack)) {
                    return true;
                }
                stack.pop();
            }
        }
        stack.pop();
        return false;
    };

    /*
     * Methoden fuer die Visualisierung.
     * Das Layout und Aussehen von Knoten und Kanten wird hier festgelegt.
     * */
    var setEdgeMatched = function(edge){
        edge.state.color = "green";
        edge.state.width = global_Edgelayout.lineWidth*1.3;
    };
    var setEdgeNotMatched = function(edge){
        edge.state.color = global_Edgelayout.lineColor;
        edge.state.width = global_Edgelayout.lineWidth;
    };
    var setNodeMatched = function(node){
        node.state.color = const_Colors.NodeFillingHighlight;
        node.state.strokeColor = global_NodeLayout.borderColor;
    };
    var setNodeNotMatched = function(node){
        node.state.color = const_Colors.NodeFilling;
        node.state.strokeColor = global_NodeLayout.borderColor;
        node.state.strokeWidth = global_NodeLayout.borderWidth;
    };
    var highlightNode = function(node){
        node.state.strokeColor = "Navy";
        node.state.strokeWidth = global_NodeLayout.borderWidth*1.5;
    };
    var highlightEdge = function(edge){
        edge.state.width = global_Edgelayout.lineWidth*2.9;
    };
    var highlightFreeNode = function(node){
        node.state.strokeWidth = global_NodeLayout.borderWidth * 2;
        node.state.color = "SteelBlue";
    };
    var hideEdge = function(edge) {
        if(matching[edge.id]){
            edge.state.width = global_Edgelayout.lineWidth * 0.6;
        }
        else edge.state.width = global_Edgelayout.lineWidth * 0.3;
    };
    var hideNode = function(node){
        node.state.color = "DarkGray";
        node.state.strokeWidth = global_NodeLayout.borderWidth;
        node.state.strokeColor = "Gray";
    };

    /**
     * Initialisiere den Algorithmus.
     * @method
     */
    this.initialize = function () {
        this.beginIteration();
        if(!this.fastForwardIntervalID) $("#"+st+"_button_Zurueck").button("option", "disabled", false);
    };

    /*
     * Jede neue Iteration beginnt mit dieser Methode. Es werden Breitensuche und Tiefensuche ausgefuehrt, um die kuerzesten Wege zu finden.
     * @method
     * */
    this.beginIteration = function () {
        iteration++;
        disjointPaths = [];
        currentPath = 0;
        shortestPathLength = 0;
        isShownBfsTree = false;
        // finde alle freien Knoten in der U-Partition
        var superNode = {};
        for (var n in Graph.instance.unodes) {
            var node = Graph.instance.unodes[n];
            if(!that.isMatched(node))superNode[node.id] = node;
        }
        //fuehre Breiten- und Tiefensuche aus
        bfs(superNode);

        developBFStree(bfsEdges, superNode)
        // console.log(bfsEdges[1][0])

        dfs(superNode);

        // console.log(matching)
        // console.log(disjointPaths)

        //restore Layouts 
        Graph.instance.nodes.forEach( function(nodeID, node) {
            if(that.isMatched(node)) setNodeMatched(node);
            else setNodeNotMatched(node);
        });
        Graph.instance.edges.forEach( function(edgeID, edge) {
            setEdgeNotMatched(edge);
        });
        for(var e in matching){
            setEdgeMatched(Graph.instance.edges.get(e));
        }
        if(shortestPathLength > 0){
            s.id = NEXT_AUGMENTING_PATH;
            $(statusErklaerung).html('<h3>'+iteration+'. '+LNG.K('textdb_text_iteration')+'</h3>'
                + "<h3> "+LNG.K('textdb_msg_begin_it')+"</h3>"
                + "<p>"+LNG.K('textdb_msg_begin_it_1')+"<p>"
                + "<p>"+LNG.K('textdb_msg_path_shortest')+ shortestPathLength + "</p>"
                + "<p>"+LNG.K('textdb_msg_begin_it_2')+"<p>"
                + "<p>"+LNG.K('textdb_msg_begin_it_3')+"<p>");
        }
        else if (isShownBfsTree === false) {
            isShownBfsTree = true;
            s.id = SHOW_BFS_TREE;
            console.log('show bfs tree in this step', s.id)
        } 
        else {
            s.id = END_ALGORITHM;
            $(statusErklaerung).html("<h3> "+LNG.K('textdb_msg_end_algo')+"</h3>"
                + "<p>"+LNG.K('textdb_msg_end_algo_1')+"</p>");
        }
    };
    /*
     * Der aktuelle Augmentationsweg wird hervorgehoben.
     * @param {Object} path   Der aktuelle Augmentationsweg
     * @method
     * */
    this.highlightPath = function(path){
        //alle Kanten ein wenig in den Hintergrund
        //for(var e in graph.edges) graph.edges[e].setLayout("lineWidth", global_Edgelayout.lineWidth * 0.9);
        //hervorheben des Augmentationsweges(Knoten und Kanten)
        for(var n = 0; n < path.length; n=n+2){
            var node = path[n];
            highlightNode(node);
            if(n < path.length - 1){
                var edge = path[n+1];
                highlightEdge(edge);
            }
        }
        //die freien Knoten hervorheben(erster und letzter Knoten auf dem Weg)
        highlightFreeNode(path[0]);
        highlightFreeNode(path[path.length-1]);

        //statuserklaerung
        $(statusErklaerung).html('<h3>'+iteration+'. '+LNG.K('textdb_text_iteration')+'</h3>'
            + "<h3> "+LNG.K('textdb_msg_path_highlight')+"</h3>"
            + "<p>"+LNG.K('textdb_msg_path_shortest')+ shortestPathLength + "</p>"
            + "<p> "+LNG.K('textdb_msg_path_highlight_1')+"<p>"
            + "<p> "+LNG.K('textdb_msg_path_highlight_2')+"<p>");
        s.id = UPDATE_MATCHING;
    };

    /*
     * Das Matching wird durch den aktuellen Augmentationsweg verbessert.
     * Die Kanten des aktuellen Augmentationsweges werden vertauscht.
     * @param {Object} path   Der aktuelle Augmentationsweg
     * @method
     * */
    this.augmentMatching = function(path){
        //iteriere ueber alle Kanten auf dem Augmentierungsweg
        for (var i = 1; i < path.length-1; i = i + 2) {
            var edge = path[i];
            //vertausche die Kanten
            if(matching[edge.id]){
                delete matching[edge.id];
                setEdgeNotMatched(edge);
                highlightEdge(edge);
            }
            else{
                matching[edge.id] = edge;
                matched[path[i-1].id] =  path[i+1];
                matched[path[i+1].id] =  path[i-1];
                setEdgeMatched(edge);
                highlightEdge(edge);
            }
            setNodeMatched(path[i-1]);
        }
        setNodeMatched(path[path.length-1]);
        //statuserklaerung
        s.id = GRAY_PATH;
        $(statusErklaerung).html('<h3>'+iteration+'. '+LNG.K('textdb_text_iteration')+'</h3>'
            + "<h3> "+LNG.K('textdb_msg_update')+"</h3>"
            + "<p>"+LNG.K('textdb_msg_update_1')+ "</p>"
            + "<p>"+LNG.K('textdb_msg_update_2')+ "</p>");
    };

    /*
     * Die auf dem Augmentationsweg benutzten Knoten und inzidenten Kanten werden ausgeblendet.
     * @param {Object} path   Der aktuelle Augmentationsweg
     * @method
     * */
    this.hidePath = function(path){
        for (var i = 0; i < path.length; i = i + 2) {
            var node = path[i];
            hideNode(node);
            // gray out OutEdges
            var edges = node.getOutEdges();
            for(var e in edges){
                hideEdge(edges[e]);
            }
            // gray out InEdges
            edges = node.getInEdges();
            for(var e in edges){
                hideEdge(edges[e]);
            }
        }
        currentPath++;
        //statuserklaerung
        if(currentPath < disjointPaths.length){
            s.id = NEXT_AUGMENTING_PATH;
        }
        else s.id = END_ITERATION;
        $(statusErklaerung).html('<h3>'+iteration+'. '+LNG.K('textdb_text_iteration')+'</h3>'
            + "<h3> "+LNG.K('textdb_msg_gray')+"</h3>"
            + "<p>"+LNG.K('textdb_msg_gray_1')+ "</p>");
    };

    /*
    * Beendet die Iteration.
    * @method
    * */
    this.endIteration = function(){
        s.id = BEGIN_ITERATION;
        //statuserklaerung
        $(statusErklaerung).html('<h3>'+iteration+'. '+LNG.K('textdb_text_iteration')+'</h3>'
            + "<h3> "+LNG.K('textdb_msg_end_it')+"</h3>"
            + "<p>"+LNG.K('textdb_msg_end_it_1')+shortestPathLength+".</p>"
            + "<p>"+LNG.K('textdb_msg_end_it_2')+"</p>");
    };

    /**
     * Zeigt Texte und Buttons zum Ende des Algorithmen
     * @method
     */
    this.endAlgorithm = function() {
        //Button, der das Matching anzeigt
        toggleMatchButton = true;
        $(statusErklaerung).append("<button id=show_match>"+LNG.K('algorithm_btn_match')+"</button>");
        $("#show_match").button().click(function() {
            if(toggleMatchButton){
                //alle Nicht-Matching-Kanten in den Hintergrund
                Graph.instance.edges.forEach( function (edgeID, edge) {
                    edge.state.width = global_Edgelayout.lineWidth * 0.3;
                });
                $("#show_match").button( "option", "label", LNG.K('algorithm_btn_match1') );
            }
            else{
                Graph.instance.edges.forEach( function (edgeID, edge) {
                    edge.state.color = global_Edgelayout.lineColor;
                    edge.state.width = global_Edgelayout.lineWidth;
                });
                $("#show_match").button( "option", "label", LNG.K('algorithm_btn_match') );
            }
            //Matching-Kanten formatieren
            for(var e in matching) setEdgeMatched(matching[e]);
            toggleMatchButton = !toggleMatchButton;
            that.update();
        });
        //Forschungsaufgabe und Erklaerung
        $(statusErklaerung).append("<p></p><h3>"+LNG.K('algorithm_msg_finish')+"</h3>");
        $(statusErklaerung).append("<button id=button_gotoIdee>"+LNG.K('algorithm_btn_more')+"</button>");
        $(statusErklaerung).append("<h3>"+LNG.K('algorithm_msg_test')+"</h3>");
        $("#button_gotoIdee").button();
        $("#button_gotoIdee").click(function() {$("#tabs").tabs("option","active", 3);});
        // Falls wir im "Vorspulen" Modus waren, daktiviere diesen
        if(this.fastForwardIntervalID != null) {
            this.stopFastForward();
        }
        s.id = 8;
    };


    this.onNodesUpdated = function(selection) {
        selection
        .selectAll("circle")
        .style("fill", function(d) {
            return d.state.color;
        })
        .style("stroke", function(d) {
            return d.state.strokeColor;
        })
        .style("stroke-width", function(d) {
            return d.state.strokeWidth;
        });
    }

    this.onEdgesUpdated = function(selection) { 
        selection
        .selectAll("line")
        .style("stroke", function(d) {
            return d.state.color;
        })
        .style("stroke-width", function(d) {
            return d.state.width;
        })
        .style("stroke-dasharray", function(d) {            
            return d.state.dashed ? ("10, 5") : null;
        });
    }

    /**
     * updates status description and pseudocode highlight based on current s.id
     * @method
     */
    this.updateDescriptionAndPseudocode = function() {
        if(this.fastForwardIntervalID != null) {
            this.setDisabledForward(true,false);
            this.setDisabledBackward(true);
        }
        else if (s.id == 0) {
            this.setDisabledForward(false);
            this.setDisabledBackward(true);
        } 
        else if (s.id == 8) {
            this.setDisabledForward(true);
            this.setDisabledBackward(false);
        }
        else {
            this.setDisabledForward(false);
            this.setDisabledBackward(false);
        }
    };

    /**
     * Setzt das Ausgabefenster, wo Erklaerungen ausgegeben werden.
     * @param {String} fenster   Der Kontext des neuen Ausgabefensters
     * @method
     */
    this.setStatusWindow = function(fenster){
        st = fenster;
        statusErklaerung = "#"+st+"_div_statusErklaerung";
    };
    /**
     * Gibt die Laenge des kuerzesten Pfades der aktuellen Phase aus.
     * @method
     */
    this.getShortestPathLength = function(){
        return shortestPathLength;
    };
    /**
     * Gibt zurueck, ob der Knoten gematcht ist.
     * @param {Object} node Knoten
     * @method
     */
    this.isMatched = function (node){
        return (matched[node.id] != null);
    };
    /**
     * Gibt den Partner des Knoten zurueck, falls er existiert.
     * @param {Object} node Knoten
     * @method
     */
    this.getPartner = function (node){
        return matched[node.id];
    };
    /**
     * Gibt das aktuelle Matching zurueck.
     * @method
     */
    this.getMatching = function(){
        return matching;
    };
    /**
     * Gibt den aktuellen Augmentationsweg zurueck.
     * @method
     */
    this.getPath = function () {
        return disjointPaths[currentPath];
    };
    /**
     * Beendet die aktuelle Iteration und beginnt eine neue.
     * Die Methode wird fuer die zweite Forschungsaufgabe benoetigt.
     * @method
     */
    this.startNewIteration = function() {
        this.endIteration();
        this.nextStepChoice();
    };
};

// Vererbung realisieren
HopcroftKarp.prototype = Object.create(GraphDrawer.prototype);
HopcroftKarp.prototype.constructor = HopcroftKarp;
