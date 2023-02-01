/**
 * Hier wird der bipartite Graph und alle zugehörigen Fuktionen definiert.<br>
 * Außerdem wird die Klasse BipartiteGraphDrawer definiert, die es ermöglicht auf das Canvas zu zeichnen<br>
 * Schließich werden einige globale Objekte definiert.
 */

/**
 * Einige Konstanten, die im BipartiteGraph genutzt werden.
 * @type Object
 */
var graph_constants = {
    U_POSITION : 100, //standard 100
    V_POSITION : 400,//standard 400
    LEFT_POSITION : 60,
    DIFF: 80,
    MAX_NODES: 8
};

/**
 * Datenstruktur für einen bipartiten Graph.
 * @constructor
 */
var Graph = function(){
    /**
     *  Knoten der ersten Knotenmenge, assoziatives Array mit den KnotenIDs als Schlüssel
     *  und den Knoten als Wert.
     *  @type Object
     */
    this.unodes = new Object();
    /**
     *  Knoten der zweiten Knotenmenge, assoziatives Array mit den KnotenIDs als Schlüssel
     *  und den Knoten als Wert.
     *  @type Object
     */
    this.vnodes = new Object();
    this.nodeIds=0;
    this.edgeIds=0;
    this.nodes=d3.map();      // key: node ID, value: node
    this.edges=d3.map();      // key: edge ID, value: edge 
    this.edgeMap = d3.map();  // key: unique value derived from start node and end node ID, value: edge
}

/**
 * Represents a graph node
 * @constructor
 */
Graph.Node = function(x,y,id){
  this.x=x;
  this.y=y;
  this.id=id;
  this.resources = [];
  
  this.outEdges = d3.map();
  this.inEdges = d3.map();    

  this.state={};//changes during algorithm runtime
}

Graph.Node.prototype.getInEdges = function(){
  return this.inEdges.values();
}

Graph.Node.prototype.getOutEdges = function(){
  return this.outEdges.values();
}

Graph.prototype.isInU = function(node) {
    return this.unodes[node.id] != undefined;
}

function styleResources(resources,left,right,f){
  var f = f || function(d){return d};
  var str = resources.map(f).join(",");
  if(resources.length>1) str = left + str + right;
  return str;
}

Graph.Node.prototype.toString = function(full,f){
  var str="";
  if(full) str += this.id+" ";
  str +=styleResources(this.resources,"[","]",f);
  return str;
}

/**
 * Represents a graph edge
 * @constructor
 */
Graph.Edge = function(s, t, id){
  this.start=s;
  this.end=t;
  this.id=id;

  this.resources=[];

  this.state={}; //changes during algorithm runtime
}

Graph.Edge.prototype.toString = function(full,f){
  var str="";
  if(full) str += this.start.id+"->"+this.end.id+" ";
  str += styleResources(this.resources,"(",")",f);
  return str;
}

Graph.Node.prototype.contains = function(mx, my) {
    var radius = global_KnotenRadius;
    return (mx - this.x)*(mx - this.x) + (my - this.y)*(my - this.y) < radius*radius;
}

/**
 * Zeigt, ob sich die gegebenen Koordinaten auf der Kante befinden.
 * Es wird geprüft ob der Mausklick nah genug (innerhalb einer Toleranz) an der Kante war.
 * @param {Number} mx				x-Koordinate
 * @param {Number} my				y-Koordinate
 * @this {Edge}
 * @returns {Boolean}
 * @method
 */
Graph.Edge.prototype.contains = function(mx,my,ctx) {
    var toleranz = 7;									// Wie viele Punkte entfernt von der Kante darf man klicken?
    var sourceX = this.start.x;
    var sourceY = this.start.y;
    var targetX = this.end.x;
    var targetY = this.end.y;    
    var alpha = Math.atan2(targetY-sourceY,targetX-sourceX);
    // Ist der Mauszeiger auf der Kante?

    var MouseShift = {x:mx-sourceX,y:my-sourceY};
    var MouseShiftRot = {x: MouseShift.x*Math.cos(-alpha) - MouseShift.y*Math.sin(-alpha),
                y: MouseShift.x*Math.sin(-alpha) + MouseShift.y*Math.cos(-alpha)};
    var targetShift = {x:targetX-sourceX,y:targetY-sourceY};
    var targetShiftRot = {x:targetShift.x*Math.cos(-alpha) - targetShift.y*Math.sin(-alpha),
                y:targetShift.x*Math.sin(-alpha) + targetShift.y*Math.cos(-alpha)};
    if(MouseShiftRot.x>=0 && MouseShiftRot.x<=targetShiftRot.x && Math.abs(MouseShiftRot.y)<=toleranz) {
        return true;
    }
    
    // Ist der Mauszeiger auf dem Text?
    var center = {x: (targetX+sourceX)/2, y:(targetY+sourceY)/2};
    var labelWidth = global_Edgelayout['fontSize']; // TO FIX
    var arrowHeight = Math.sin(global_Edgelayout['arrowAngle'])*global_Edgelayout['arrowHeadLength'];
    var c0 = {x:center.x+Math.cos(alpha)*labelWidth/2,
        y:center.y+Math.sin(alpha)*labelWidth/2};
    var c1 = {x:center.x-Math.cos(alpha)*labelWidth/2,
        y:center.y-Math.sin(alpha)*labelWidth/2};
    var c11 = {x:c1.x + Math.cos(alpha + Math.PI/2)*(-3-arrowHeight-global_Edgelayout['fontSize']),
                y:c1.y + Math.sin(alpha + Math.PI/2)*(-3-arrowHeight-global_Edgelayout['fontSize'])};
    var upperCornerOld = {x:c11.x-c0.x,y:c11.y-c0.y};
    var upperCorner = {x:upperCornerOld.x*Math.cos(-alpha) - upperCornerOld.y*Math.sin(-alpha),
                y:upperCornerOld.x*Math.sin(-alpha) + upperCornerOld.y*Math.cos(-alpha)};

    var rotatedMouseOld = {x:mx-c0.x,y:my-c0.y};
    var rotatedMouse = {x: rotatedMouseOld.x*Math.cos(-alpha) - rotatedMouseOld.y*Math.sin(-alpha),
                y: rotatedMouseOld.x*Math.sin(-alpha) + rotatedMouseOld.y*Math.cos(-alpha)};
    if(rotatedMouse.x<=0 && rotatedMouse.x>= upperCorner.x && rotatedMouse.y<=0 && rotatedMouse.y>= upperCorner.y) {
        return true;
    }
    return false;
};

    /**
     *  Die addNode Methode der Oberklasse
     *  @type method
     */
    Graph.prototype.base_addNode = function(x,y,resources){
      var node = new Graph.Node(+x,+y,this.nodeIds++);
      node.resources=resources || [];
      for(var i = 0, toAdd = this.getNodeResourcesSize() - node.resources.length; i<toAdd; i++){
        node.resources.push(0);
      }
      this.nodes.set(node.id,node);
      return node;
    }
	
	Graph.prototype.base_addNodeWithID = function(x, y, nodeId, resources){
		var node = new Graph.Node(+x, +y, nodeId);
		node.resources=resources || [];
		for(var i = 0, toAdd = this.getNodeResourcesSize() - node.resources.length; i<toAdd; i++){
			node.resources.push(0);
		}
		this.nodes.set(node.id,node);
		return node;
	}

    /**
     *  Die addEdgee Methode der Oberklasse
     *  @type method
     */
    Graph.prototype.base_addEdge = function(startId,endId,resources){
        var s = this.nodes.get(startId);
        var t = this.nodes.get(endId);
        var edge = new Graph.Edge(s, t, this.edgeIds++);
        edge.resources=resources;
        edge.start.outEdges.set(edge.id,edge);
        edge.end.inEdges.set(edge.id,edge);
        this.edges.set(edge.id,edge);
        // Add edge to edge map. First compute unique key from start and end node ID with Cantor's pairing function.
        var key = s.id + 0.5*(s.id + t.id)*(s.id + t.id + 1);
        this.edgeMap.set(key, edge);        
        return edge;
    }
	
	Graph.prototype.base_addEdgeWithID = function(startId, endId, edgeId, resources) {
		var s = this.nodes.get(startId);
		var t = this.nodes.get(endId);
		var edge = new Graph.Edge(s, t, edgeId);
		edge.resources=resources;
		edge.start.outEdges.set(edge.id,edge);
		edge.end.inEdges.set(edge.id,edge);
		this.edges.set(edge.id,edge);  
        // Add edge to edge map. First compute unique key from start and end node ID with Cantor's pairing function.
        var key = s.id + 0.5*(s.id + t.id)*(s.id + t.id + 1);
        this.edgeMap.set(key, edge); 		
		return edge;
}

    /**
     *  Die removeNode Methode der Oberklasse
     *  @type method
     */
    Graph.prototype.base_removeNode = function(id){
      var that=this;
      var node = this.nodes.get(id);
      node.outEdges.forEach(function(key,value){
          that.removeEdge(key);
      });
      node.inEdges.forEach(function(key,value){
          that.removeEdge(key);
      });
      this.nodes.remove(id);
      return node;
    }

    Graph.prototype.removeEdge = function(id){
        var startID = this.edges.get(id).start.id;
        var endID = this.edges.get(id).end.id;
        this.nodes.get(startID).outEdges.remove(id);
        this.nodes.get(endID).inEdges.remove(id);
        var key = startID + 0.5*(startID + endID)*(startID + endID + 1);
        this.edgeMap.remove(key);  
        return this.edges.remove(id);
    }

    Graph.prototype.removeUnfinishedEdge = function(id) {
        this.edgeIds--;
        return this.edges.remove(id);
    }

    /*
     * Verteilt die Knoten auf dem Canvas
     * @method
     */
    Graph.prototype.reorderNodes = function(){
        var diffu; // der Abstand zwischen den Knoten in der oberen Partition
        var diffv; // der Abstand zwischen den Knoten in der unteren Partition
        var sizeu = Object.keys(this.unodes).length; // die Anzahl der Knoten in der unteren Partition
        var sizev = Object.keys(this.vnodes).length; // die Anzahl der Knoten in der oberen Partition
        var svg = d3.select("#tg_canvas_graph");
        var svgWidth = svg.attr("width");
        if(svg == null){
            diffu = diffv = graph_constants.DIFF;
        }
        else{
            diffu = Math.min((svgWidth-50)/sizeu,graph_constants.DIFF);
            diffv = Math.min((svgWidth-50)/sizev,graph_constants.DIFF);
        }
        var i = 0;
        for(var n in this.unodes){
            var node = this.unodes[n];
            var offset = 0;
            if(diffu < graph_constants.DIFF) offset = graph_constants.LEFT_POSITION / graph_constants.MAX_NODES * sizeu / 4;
            node.x = graph_constants.LEFT_POSITION -offset + (i++*diffu);
            node.y = graph_constants.U_POSITION;
        }
        i = 0;
        for(var n in this.vnodes){
            var node = this.vnodes[n];
            var offset = 0;
            if(diffv < graph_constants.DIFF) offset = graph_constants.LEFT_POSITION / graph_constants.MAX_NODES * sizev / 4;
            node.x = graph_constants.LEFT_POSITION - offset + (i++*diffv);
            node.y = graph_constants.V_POSITION;
        }
    };

    /**
     * Fügt dem Graph einen Knoten hinzu
     * @method
     * @param {Boolean} isInU Gibt an, ob der Knoten in die erste Knotenmenge hinzugefuegt werden soll
     * @return {GraphNode}
     */
    Graph.prototype.addNode = function (isInU) {
        var numberOfNodes;
        if(isInU) numberOfNodes = Object.keys(this.unodes).length;
        else numberOfNodes = Object.keys(this.vnodes).length;

        if(numberOfNodes < graph_constants.MAX_NODES){
            var node = this.base_addNode(0,0, []);
            if(isInU) {
                this.unodes[node.id] = node;
            }
            else{
                this.vnodes[node.id] = node;
            }
            this.reorderNodes();
        }
        return node;
    };
	
	
    Graph.prototype.addNodeWithID = function (isInU, posX, posY, id) {
        var numberOfNodes;
        if(isInU) numberOfNodes = Object.keys(this.unodes).length;
        else numberOfNodes = Object.keys(this.vnodes).length;

        if(numberOfNodes < graph_constants.MAX_NODES){
            var node = this.base_addNodeWithID(posX,posY,id, []);
            if(isInU) {
                this.unodes[node.id] = node;
            }
            else{
                this.vnodes[node.id] = node;
            }
            this.reorderNodes();
        }
        return node;
    };	
    /**
     * Entfernt den angegebenen Knoten aus dem Graph
     * @method
     * @param {Number} nodeID ID des zu löschenden Knoten.
     */
    Graph.prototype.removeNode = function(nodeID) {
        this.base_removeNode(nodeID);
        delete this.unodes[nodeID];
        delete this.vnodes[nodeID];
        this.reorderNodes();
    };
    /**
     * Fügt dem Graph eine Kante hinzu
     * @method
     * @param {GraphNode} source   Anfangsknoten der Kante.
     * @param {GraphNode} target   Endknoten der Kante.
     * @param {Number} weight Gewicht der Kante.
     * @return {Edge}
     */
    Graph.prototype.addEdge = function(source,target,weight) {
        if(source == null || target == null) return null;
        //check first if its bipartite
        if ((this.unodes[source.id] === source && this.unodes[target.id] === target) ||
            (this.vnodes[source.id] === source && this.vnodes[target.id] === target)) {
            return null;
        }
        //Die Richtung der Kanten ist immer von U nach V
        var resources = [];
        resources.push(weight);
        if(this.unodes[source.id]) return this.base_addEdge(source.id, target.id, resources);
        else return this.base_addEdge(target.id, source.id, resources);
    };
	
    Graph.prototype.addEdgeWithID = function(source,target,id,weight) {
        if(source == null || target == null) return null;
        //check first if its bipartite
        if ((this.unodes[source.id] === source && this.unodes[target.id] === target) ||
            (this.vnodes[source.id] === source && this.vnodes[target.id] === target)) {
            return null;
        }
        //Die Richtung der Kanten ist immer von U nach V
        var resources = [];
        resources.push(weight);
        if(this.unodes[source.id]) return this.base_addEdgeWithID(source.id, target.id, id, resources);
        else return this.base_addEdgeWithID(target.id, source.id, id, resources);
    };
	
	

    // If end node is not known at that time. (For the Graph Editor.)
    Graph.prototype.addUnfinishedEdge = function(edge) {
        edge.id = this.edgeIds++; 
        this.edges.set(edge.id,edge);
        return edge;  
    }

    Graph.prototype.addCompleteEdge = function(edge){
        edge.id = this.edgeIds++;
        edge.start.outEdges.set(edge.id,edge);
        edge.end.inEdges.set(edge.id,edge);
        this.edges.set(edge.id,edge);
        var max = this.getEdgeResourcesSize();
        while(edge.resources.length<max) edge.resources.push(Math.floor(Math.random()*100.0));
        // Add edge to edge map. First compute unique key from start and end node ID with Cantor's pairing function.
        var key = edge.start.id + 0.5*(edge.start.id + edge.end.id)*(edge.start.id + edge.end.id + 1);
        this.edgeMap.set(key, edge);   
        return edge;
    }

    Graph.prototype.addNodeDirectly = function(node){
      node.id = this.nodeIds++;
      for(var i = 0, toAdd = this.getNodeResourcesSize() - node.resources.length; i<toAdd; i++){
        node.resources.push(0);
      }
      this.nodes.set(node.id,node);
      return node;
    }

/**
 * Zeigt, ob ein Kante zwischen den beiden Knoten existiert
 * @method
 * @param {GraphNode} source   Anfangsknoten der Kante.
 * @param {GraphNode} target   Endknoten der Kante.
 * @return {Number}
 * @this {Graph}
 */
Graph.prototype.getEdgeBetween= function(source,target) {
    var resultID = null;
    this.edges.forEach( function(edgeID, edge) {
        if((edge.start.id == source.id && edge.end.id == target.id) ||
            (edge.end.id == source.id && edge.start.id == target.id)) {
            resultID = edgeID;
        }
    });
    return resultID;
};

/////////////////
//MEMBERS


Graph.prototype.getNodes = function(){
//   return this.__nodesArr || (this.__nodesArr = this.nodes.values());  //TODO just for testing update pattern
  return this.nodes.values();
}

Graph.prototype.getEdges = function(){
//   return this.__edgesArr || (this.__edgesArr = this.edges.values());
  return this.edges.values();
}

Graph.prototype.toString = function(){
  var lines = []; //text.split("\n");

  lines.push("% Graph saved at "+new Date());
  
  lines.push(Object.keys(this.unodes).length + " " + Object.keys(this.vnodes).length);

  this.nodes.forEach(function(key,node){
      var line = "n " + node.x + " " + node.y + " " + node.id;
      if(node.resources.length>0) line +=" "+node.resources.join(" ");
      lines.push(line);
  });
  this.edges.forEach(function(key,edge){
      var line = "e " + edge.start.id + " " + edge.end.id + " " + edge.id;
      if(edge.resources.length>0) line +=" "+edge.resources.join(" ");
      lines.push(line);
  });

  return lines.join("\n");
}

Graph.prototype.getNodeResourcesSize = function(){
  var max=0;
  this.nodes.forEach(function(key,node){
     max = Math.max(max,node.resources.length);
  });
  return max;
}

Graph.prototype.getEdgeResourcesSize = function(){
  var max=0;
  this.edges.forEach(function(key,edge){
     max = Math.max(max,edge.resources.length);
  });
  return max;
}

Graph.prototype.replace = function(oldGraph){
  this.nodeIds = oldGraph.nodeIds;
  this.edgeIds = oldGraph.edgeIds;
  this.nodes = oldGraph.nodes;
  this.edges = oldGraph.edges;
}

Graph.prototype.getState = function(){
  var savedState = { nodes : {}, edges : {} };
  this.nodes.forEach(function(key,node){
     savedState.nodes[key] = JSON.stringify(node.state);
  });
  this.edges.forEach(function(key,edge){
     savedState.edges[key] = JSON.stringify(edge.state);
  });
  return savedState;
}

Graph.prototype.setState = function(savedState){
  this.nodes.forEach(function(key,node){
     node.state = JSON.parse(savedState.nodes[key]);
  });
  this.edges.forEach(function(key,edge){
     edge.state = JSON.parse(savedState.edges[key]);
  });
}

/////////////////
//STATICS

/**
 * Graph Parser factory method
 * @static
 * @method
 * @param {String} text - sequentialized Graph
 * @return {Graph} - parsed Graph object
 */
Graph.parse = function(text){
    var graph = new Graph();
    var lines = text.split("\n");                     // Nach Zeilen aufteilen
    var ucard = 0;
    var vcard = 0;
    var i;
    for(i = 0; i < lines.length; i++) {
        if(lines[i].substring(0,1) === "%") continue;
        var parameter = lines[i].split(" ");
        if(!isNaN(parseInt(parameter[0]))) {
            i++;
            break;
        }
    }
    for(; i < lines.length; i++) {
        if(lines[i].substring(0,1) === "%") continue;
        var parameter = lines[i].split(" ");     // Nach Parametern aufteilen
        if(parameter[0] === "n") {
            if(!isNaN(parseInt(parameter[1])) && !isNaN(parseInt(parameter[2]))) {
                var positionY = parseInt(parameter[2]);
                if(positionY === graph_constants.U_POSITION) {
                    graph.addNodeWithID(true, parseInt(parameter[1]), parseInt(parameter[2]), parseInt(parameter[3]));
					graph.nodeIds = parseInt(parameter[3]) + 1;
                }else if(positionY == graph_constants.V_POSITION) {
                    graph.addNodeWithID(false, parseInt(parameter[1]), parseInt(parameter[2]), parseInt(parameter[3]));
					graph.nodeIds = parseInt(parameter[3]) + 1;
                }
            }
        }else if(parameter[0] === "e") {
            if(!isNaN(parseInt(parameter[1])) && !isNaN(parseInt(parameter[2])) && !isNaN(parseFloat(parameter[4]))) {
                var sourceId = parseInt(parameter[1]);
                var targetId = parseInt(parameter[2]);
				var id = parseInt(parameter[3]);
                var weight = parseFloat(parameter[4]);
                //check if bipartite here
                graph.addEdge(graph.nodes.get(sourceId), graph.nodes.get(targetId), weight);
				graph.edgeIds = parseInt(parameter[3]) + 1;
            }
        }
    }
    return graph;
}

Graph.createRandomGraph = function() {
    var graph = new Graph();
    
    var NumberOfNodes = 7;
    var svg = d3.select("#tg_canvas_graph");
    var svgWidth = svg.attr("width");
    var diff = (svgWidth - 100) / NumberOfNodes;
    // Knoten erstellen
    for(var i = 0; i < NumberOfNodes; i++) {
        graph.addNode(true);
        graph.addNode(false);
    }

    // Kanten erstellen, mit WSKeit 30 %
    for(var i in graph.unodes) {
        for(var j in graph.vnodes) {
            if(Math.random() < 0.3) {
                graph.addEdge(graph.unodes[i], graph.vnodes[j], 1);
            }
        }
    }

    return graph;
}

Graph.setGraph = function(tabprefix) {
    var selection = $("#" + tabprefix + "_select_GraphSelector>option:selected").val();
    var filename = "";

    if (selection == "Standardbeispiel") selection = "Standard Example";
    else if (selection == "Vollständiger Graph") selection = "Complete Graph";
    else if (selection == "Ungleiche Knotenzahl") selection = "Different Set Sizes";
    else if (selection == "Zufallsgraph") selection = "Random Graph";

    switch (selection) {
        case "Standard Example":
            filename = "standard.txt";
            break;
        case "Complete Graph":
            filename = "complete.txt";
            break;
        case "Different Set Sizes":
            filename = "uneven.txt";
            break;
        case "Random Graph":
            Graph.instance = Graph.createRandomGraph();
            Graph.onLoadedCbFP.forEach(function(fp){fp()});
            return;
    }

    var GRAPH_FILENAME = GRAPH_FILENAME || null;
    var completeFilename = GRAPH_FILENAME || "graphs/" + filename; //the selected option 
    Graph.loadInstance(completeFilename,function(error,text,completeFilename){
        console.log("error loading graph instance "+error + " from " + filename +" text: "+text);
    }); 
}

Graph.load = function(filename, callbackFp){
  d3.text(filename, function(error,text){
    var graph = Graph.parse(text);
    callbackFp(graph);
  });
}

Graph.setInstance = function(error,text,filename,exceptionFp){
    if(error != null){
      exceptionFp ? exceptionFp(error,text,filename) : console.log(error,text,filename);
      return;
    };
    var noErrors=false;
    try{
      Graph.instance = Graph.parse(text);
      noErrors=true;
    }catch(ex){
      if(exceptionFp) exceptionFp(ex,text,filename);
      else console.log(ex,text,filename);
    }
    if(noErrors) Graph.onLoadedCbFP.forEach(function(fp){fp()});
}

Graph.loadInstance = function(filename,exceptionFp){
  d3.text(filename, function(error,text){
    Graph.setInstance(error,text,filename,exceptionFp)
  });
}

Graph.instance = null;

Graph.onLoadedCbFP = [];

Graph.addChangeListener = function(callbackFp){
  Graph.onLoadedCbFP.push(callbackFp);
}

Graph.handleFileSelect = function(evt,exceptionFp) {
    var files = evt.target.files; // FileList object

    // Loop through the FileList and render image files as thumbnails.
    for (var i = 0, f; f = files[i]; i++) {

      // Only process image files.
      if (!f.type.match('text/plain')) {
        exceptionFp("wrong mimetype",f.type);
        continue;
      }

      var reader = new FileReader();

      // Closure to capture the file information.
      reader.onload = (function(theFile) {
        return function(e) {
          var error = e.target.error;
          var text = e.target.result;
          var filename = theFile.name;
          Graph.setInstance(error,text,filename,exceptionFp)
        };
      })(f);

      // Read in the image file as a data URL.
      reader.readAsText (f);
    }
}
