/**
 * Instanz des Hopcroft-Karp Algorithmus, erweitert die Klasse CanvasDrawer
 * @constructor
 * @augments GraphDrawer
 */
function Exercise2(svgSelection) {
	GraphDrawer.call(this,svgSelection);

	/**
     * closure for this class
	 * @type HopcroftKarp
	 */
    var that = this;

    var svg = d3.select("#tf2_canvas_graph");

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

    /*
     * Der Augmentationsweg, der vom Nutzer erstellt wird
     * @type Object
     * */
    var path = new Array();
    /*
     * Die Layouts von Knoten, damit das urspruengliche Layout sichergestellt werden kann
     * @type Object
     * */
    var layoutStack = new Array();
    /*
     * Maximale Anzahl von Wegen, die Nutzer finden soll
     * @type Number
     * */
    const MAX = 5;
    /*
     * Anzahl vom Nutzer erstellten Wege
     * @type Number
     * */
    var paths = 0;
    /**
     * Zeigt an, ob vor dem Verlassen des Tabs gewarnt werden soll.
     * @type Boolean
     */
    var warnBeforeLeave = false;
    /**
     * Zeigt an, eine Augmentations erfolgen soll
     * @type Boolean
     */
    var update = false;
    /**
     * Zeigt an, eine Augmentations erfolgt ist
     * @type Boolean
     */
    var afterUpdate = false;
    /**
     * status variables
     * @type Object
     */
    var s = null;

    var startClickHandler = false;

    /**
     * ID des Intervals, der für das "Vorspulen" genutzt wurde.
     * @type Number
     */
    var fastForwardIntervalID = null;

    /*
     * Hier werden die Statuskonstanten definiert
     * */
    const ALGOINIT = 0;
    const BEGIN_ITERATION = 1;
    const END_ITERATION = 2;
    const NEXT_AUGMENTING_PATH = 3;
    const UPDATE_MATCHING = 4;
    const GRAY_PATH = 5;
    const END_ALGORITHM = 6;

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

        path = new Array();
        layoutStack = new Array();
        paths = 0;
        warnBeforeLeave = false;
        update = false;
        afterUpdate = false;
        startClickHandler = false;
        fastForwardIntervalID = null;
    }

    /**
     * Makes the view consistent with the state
     * @method
     */
    this.update = function(){
        if(Graph.instance){
             Exercise2.prototype.update.call(this); //updates the graph
        }
    }

    /**
     * When Tab comes into view
     * @method
     */
    this.activate = function() {
        $("#tf2_button_1Schritt").show();
        $("#tf2_button_vorspulen").hide();
        this.setDisabledForward(false);  
        $("#tf2_div_statusErklaerung").html("<h3>" + LNG.K('aufgabe2_init') + "</h3><p>" + LNG.K('aufgabe2_init_1') + "</p><p>" + 
            LNG.K('aufgabe2_init_2') + "</p>");
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
        // load selected graph again 
        Graph.setGraph("tg");
    };

    this.getWarnBeforeLeave = function() {
        return warnBeforeLeave;
    }

    /**
     * "Spult vor", führt den Algorithmus mit hoher Geschwindigkeit aus.
     * @method
     */
    this.fastForwardAlgorithm = function() {
        $("#tf2_button_1Schritt").button("option", "disabled", true);
        if(fastForwardIntervalID == null){
            var geschwindigkeit = 200;	// Geschwindigkeit, mit der der Algorithmus ausgeführt wird in Millisekunden
            fastForwardIntervalID = window.setInterval( function() {
                that.nextStepChoice();}, geschwindigkeit);
        }
    };
    /**
     * Stoppt das automatische Abspielen des Algorithmus
     * @method
     */
    this.stopFastForward = function() {
        $("#tf2_button_1Schritt").button("option", "disabled", false);
        window.clearInterval(fastForwardIntervalID);
        fastForwardIntervalID = null;
    };
    
    this.setDisabledForward = function(disabled, disabledSpulen) {
        var disabledSpulen = (disabledSpulen!==undefined) ? disabledSpulen : disabled;
        $("#tf2_button_1Schritt").button("option", "disabled", disabled);
    };

    /**
     * Zeigt and, in welchem Zustand sich der Algorithmus im Moment befindet.
     * @returns {Number} StatusID des Algorithmus
     */
    this.getStatusID = function() {
        return s.id;
    };

    /**
     * Registriere die Klick-Handler an Buttons und canvas<br>
     * Nutzt den Event Namespace ".Forschungsaufgabe2"
     * @method
     */
    this.registerClickHandlers = function() {
        startClickHandler = true;
        svg.on("contextmenu", function(e) {
            d3.event.stopPropagation();
            d3.event.preventDefault();
            that.rightClickHandler(e);
        });
    };

    /**
     * Entferne die Klick-Handler von Buttons und canvas im Namespace ".HKAlgorithm"
     * @method
     */
    this.deregisterClickHandlers = function() {
        startClickHandler = false;
        svg.on("contextmenu", null);
    };


    /**
     * Executes the next step in the algorithm
     * @method
     */
    this.nextStepChoice = function(d) {
        if (update) {
            this.augmentMatching(path);
            path = new Array();
            update = false;
            afterUpdate = true;
            $("#tf2_div_statusErklaerung").html("<h3> "+LNG.K('textdb_msg_update')+"</h3>" + "<p>"+LNG.K('aufgabe2_update')+"</p>");
        }
        else if(afterUpdate){
            afterUpdate = false;
            paths++;
            $("#tf2_button_1Schritt").button("option", "disabled", true);
            this.startNewIteration();
            this.fastForwardAlgorithm();
        }
        else{
            var algoStatus = this.getStatusID();
            if(algoStatus == END_ALGORITHM){
                this.showResult();
            }
            else if(algoStatus == BEGIN_ITERATION || algoStatus == ALGOINIT){
                this.nextAlgoStep(d);
                if(Math.random() < 0 && paths < MAX) { // mit bestimmter Wahrscheinlichkeit am Iterationsanfang Weg einzeichnen
                    this.stopFastForward();
                    this.drawPath();
                }
                else this.fastForwardAlgorithm();
            }
            else if(algoStatus == NEXT_AUGMENTING_PATH){
                if(Math.random() < 0.5 && paths < MAX){
                    this.stopFastForward();
                    this.startNewIteration();
                    this.stopFastForward();
                    this.drawPath();
                }
                else this.nextAlgoStep(d);
            }
            else this.nextAlgoStep(d);
        }
        this.update();
    };

    /**
     * Executes the next step in the algorithm
     * @method
     */
    this.nextAlgoStep = function(d) {
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

    /**
     * Initialisiere den Algorithmus.
     * @method
     */
    this.initialize = function () {
        this.beginIteration();
        warnBeforeLeave = true;
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
        // finde alle freien Knoten in der U-Partition
        var superNode = {};
        for (var n in Graph.instance.unodes) {
            var node = Graph.instance.unodes[n];
            if(!that.isMatched(node))superNode[node.id] = node;
        }
        //fuehre Breiten- und Tiefensuche aus
        bfs(superNode);
        dfs(superNode);
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
        }
        else{
            s.id = END_ALGORITHM;
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
        s.id = GRAY_PATH;
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
    };

    /*
    * Beendet die Iteration.
    * @method
    * */
    this.endIteration = function(){
        s.id = BEGIN_ITERATION;
    };

    /**
     * Zeigt Texte und Buttons zum Ende des Algorithmen
     * @method
     */
    this.endAlgorithm = function() {
        // Falls wir im "Vorspulen" Modus waren, daktiviere diesen
        if(this.fastForwardIntervalID != null) {
            this.stopFastForward();
        }
        s.id = 7;
    };

    /**
     * Der Nutzer wird aufgefordert ein Augmentatonsweg einzuzeichnen
     * @method
     */
    this.drawPath = function() {
        this.registerClickHandlers();
        $("#tf2_button_1Schritt").button("option", "disabled", true);
        $("#tf2_div_statusErklaerung").html("<h3>"+LNG.K('aufgabe2_header')+"</h3>" + "<p>"+LNG.K('aufgabe2_path')+"</p>" + "<p>"+LNG.K('aufgabe2_legend')+"</p>");
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
        node.state.strokeWidth = global_NodeLayout.borderWidth;
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
    var markNode = function(){
        var n1 = path[path.length-1];
        n1.state.strokeWidth = global_NodeLayout.borderWidth*1.3;
        if(path.length>1){
            var n2 = path[path.length-2];
            n2.state.strokeWidth = global_NodeLayout.borderWidth*1.3;
            Graph.instance.edges.get(Graph.instance.getEdgeBetween(n1,n2)).state.width = global_Edgelayout.lineWidth*1.7;
        }
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

    this.onNodesEntered = function(selection) {
        selection.on("click", function(d) {
            if (startClickHandler) 
                that.clickHandler(d);
        });
    }

    /**
     * Behandelt die Rechtsklicks im Canvas<br>
     * @param {jQuery.Event} e jQuery Event Objekt, enthält insbes. die Koordinaten des Mauszeigers.
     * @method
     */
    this.rightClickHandler = function(e) {
        if(path.length>0){
            var node = path.pop();
            var layout = layoutStack.pop();
            node.state.color = layout.color;
            node.state.strokeColor = layout.strokeColor;
            node.state.strokeWidth = layout.strokeWidth;
            if(path.length>0){
                var edge = path.pop();
                layout = layoutStack.pop();
                edge.state.width = layout.width;
                edge.state.color = layout.color;
                edge.state.dashed = layout.dashed;
            }
        }
        this.update();
    };

    /**
     * Behandelt Klicks im Canvas<br>
     * @param {jQuery.Event} e jQuery Event Objekt, enthält insbes. die Koordinaten des Mauszeigers.
     * @method
     */
    this.clickHandler = function(node){
        if(node != null){
            var free = !(this.isMatched(node));
            $("#tf2_div_statusErklaerung").html("<h3>"+LNG.K('aufgabe2_header')+"</h3>" + "<p>"+LNG.K('aufgabe2_path')+"</p>" + "<p>"+LNG.K('aufgabe2_legend')+"</p>");
            if(path.length == 0){
                if(!free) {
                    $("#tf2_div_statusErklaerung").append(getWarning(LNG.K('aufgabe2_warn_1')));
                }
                else{
                    $("#tf2_div_statusErklaerung").append("<p>"+LNG.K('aufgabe2_result_1')+"</p>");
                    path.push(node);
                    var layout = {color: node.state.color, strokeColor: node.state.strokeColor, strokeWidth: node.state.strokeWidth};
                    layoutStack.push(layout);
                    highlightNode(node);
                }
            }
            else{
                var used = false;
                for(var i in path){
                    if(path[i]==node) used = true;
                }
                var unconnected = false;
                var edge = Graph.instance.edges.get(Graph.instance.getEdgeBetween(node,path[path.length-1]));
                if(edge == undefined) unconnected = true;
                var notPartner = false;
                if(((path.length-1)/2)%2 == 1 && this.getPartner(node)!= path[path.length-1]) notPartner=true;

                if(used){
                    $("#tf2_div_statusErklaerung").append(getWarning(LNG.K('aufgabe2_warn_2')));
                }
                else if(unconnected){
                    $("#tf2_div_statusErklaerung").append(getWarning(LNG.K('aufgabe2_warn_3')));
                }
                else if(notPartner){
                    $("#tf2_div_statusErklaerung").append(getWarning(LNG.K('aufgabe2_warn_4')));
                }
                else {
                    if(free){//end of the augmenting path
                        $("#tf2_div_statusErklaerung").html("<h3> "+LNG.K('aufgabe2_header')+"</h3>" + "<p>"+LNG.K('aufgabe2_found')+"</p>");
                        update = true;
                        $("#tf2_button_1Schritt").button({disabled: false});
                        $("#tf2_button_1Schritt").show();
                        this.stopFastForward();
                        this.deregisterClickHandlers();
                    }
                    else{//grow Path
                        $("#tf2_div_statusErklaerung").append("<p>"+LNG.K('aufgabe2_result_3')+"</p>");
                    }
                    path.push(edge);
                    path.push(node);
                    var layout1 = {color: edge.state.color, width: edge.state.width, dashed: edge.state.dashed};
                    var layout2 = {color: node.state.color, strokeColor: node.state.strokeColor, strokeWidth: node.state.strokeWidth};
                    layoutStack.push(layout1);
                    layoutStack.push(layout2);
                    highlightEdge(edge);
                    highlightNode(node);
                }
            }
        }
        this.update();
    };

    /**
     * Behandelt Klicks im Canvas<br>
     * @param {jQuery.Event} e jQuery Event Objekt, enthält insbes. die Koordinaten des Mauszeigers.
     * @return {Object} Der geklickte Knoten
     * @method
     */
    var getClickedNode = function(e, mousePos){
        var pos = that.screenPosToNodePos(mousePos);
        var resultNode;
        Graph.instance.nodes.forEach( function(nodeID, node) {
            if (node.contains(pos.x, pos.y)) {
                resultNode = node;
            }
        });
        return resultNode;
    };

    /*
     * Die Warnung wird hier konstruiert
     * @method
     * */
    var getWarning = function(string){
        return  '<div id ="tg_div_warning" class="ui-widget"> \
        <div class="ui-state-highlight ui-corner-all" style="padding: .7em;"> \
        <div class="ui-icon ui-icon-alert errorIcon"></div> \
        ' + string +'\
        </div> \
        </div>';
    };

    /**
     * Zeigt die Resultate der Aufgabe an.
     * @method
     */
    this.showResult = function() {
        // Falls wir im "Vorspulen" Modus waren, daktiviere diesen
        if(this.fastForwardIntervalID != null) {
            this.stopFastForward();
        }
        $("#tf2_button_1Schritt").hide();
        $("#tf2_div_statusErklaerung").html("<h3> "+LNG.K('textdb_msg_end_algo')+"</h3>" + "<p>"+LNG.K('textdb_msg_end_algo_1')+"</p>");
        $("#tf2_div_statusErklaerung").append('<button id="tf2_button_gotoWeiteres">'+LNG.K('aufgabe2_btn_more')+'</button>');
        $("#tf2_button_gotoWeiteres").button().click(function() {$("#tabs").tabs("option","active", 6);});
        this.update();
        warnBeforeLeave = false;
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
        this.nextAlgoStep();
    };
};

// Vererbung realisieren
Exercise2.prototype = Object.create(GraphDrawer.prototype);
Exercise2.prototype.constructor = Exercise2;
