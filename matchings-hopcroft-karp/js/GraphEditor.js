// function SpaceShip(scene, x, y) {
//   Actor.call(this, scene, x, y);
//   this.points = 0;
// }
// Calling the Actor constructor first ensures that all the instance properties created by Actor are added to the new object. After that, SpaceShip can define its own instance properties such as the ship’s current points count.
// In order for SpaceShip to be a proper subclass of Actor, its prototype must inherit from Actor.prototype. The best way to do the extension is with ES5’s Object.create:
// SpaceShip.prototype = Object.create(Actor.prototype);

// Things to Remember
// - Call the superclass constructor explicitly from subclass construc- tors, passing this as the explicit receiver.
// - Use Object.create to construct the subclass prototype object to avoid calling the superclass constructor.

var GraphEditor = function(svgOrigin){
  GraphDrawer.call(this,svgOrigin,null,0);

  this.type="GraphEditor";

  this.svgOrigin
    .on("dblclick",dblclick) //for adding new nodes
    .on("mousemove",mousemove)   
    .on("contextmenu", function(d){d3.event.stopPropagation();d3.event.preventDefault()});

  // event handler for enter key
  d3.select("body")
    .on("keydown", function () {
        var key = d3.event.keyCode;
        if(key == 13) { // enter key code
            blurResourceEditor();
        }
    }); 

  this.onNodesEntered = function(selection) {
//     console.log("onNodesEntered in GraphEditor");
    
    selection
      .on("mousedown", mousedownNode)
      .on("contextmenu", contextmenuNode)
      .on("dblclick",dblclickResource);
//       .style("cursor","move") //crosshair pointer move

//     GraphDrawer.prototype.onNodesEntered.call(this,selection);
  }

  this.onNodesUpdated = function(selection){
      selection
       .style("cursor",function(d){
        return "pointer";
      })
      .selectAll("circle")
       .style("stroke", function(d){
        if(d==selectedNode){
          return const_Colors.NodeBorderHighlight;
        }else{
          return global_NodeLayout['borderColor'];
        }
      })

  }

  this.onEdgesEntered = function(selection) {
//     console.log("onEdgesEntered in GraphEditor");
    
    selection
//       .on("dblclick",dblclickEdge)
      .on("contextmenu", contextmenuEdge)
      .style("cursor","pointer") //crosshair pointer move
    
    var all =selection.on("dblclick",dblclickResource);


//     GraphDrawer.prototype.onEdgesEntered.call(this,selection);
  }

  this.onEdgesUpdated = function(selection) {
//     console.log("onEdgesEntered in GraphEditor");
    
    selection
      .style("cursor",function(d){
        return (d == unfinishedEdge) ? "crosshair" : "pointer";
      }) //crosshair pointer move

//     GraphDrawer.prototype.onEdgesEntered.call(this,selection);
  }

    var that=this;

    /**
     * Der aktuell ausgewählte Knoten
     * @type d3 Selection with typeof datum() == Graph.Node
     */
    var selectedNode = null;

    /**
      * line that is beeing drawn
      */
    var unfinishedEdge = null;


    var deselectNode = function(){
      if(selectedNode != null){
//         selectedNode.style("stroke","black");
        selectedNode = null;
      }
      unfinishedEdge = null;
          that.svgOrigin.style("cursor","default");

      blurResourceEditor();
      that.update();
    }

    var selectNode = function(selection){
      selectedNode = selection;
//       selectedNode.style("stroke","red");
    }


    /**
      * moving a mouse on the svgOrigin
      */
    function mousemove(){
      if(selectedNode != null){
          var pos = d3.mouse(this);
          var xy = that.screenPosToNodePos(pos);
          //drawing an edge
          unfinishedEdge.end.x = xy.x;
          unfinishedEdge.end.y = xy.y;
          that.updateEdges();
       }
     }

function dblclick(){
  d3.event.preventDefault();d3.event.stopPropagation();
  var pos = d3.mouse(this);
  addNode(pos);
  
}

//Es wird entweder die Auswahl aufgehoben, ein Knoten ausgewählt oder eine Kante zwischen vorhandenen Knoten erstellt.
function mousedownNode(d,id){
  if(selectedNode == d){// Falls wir wieder auf den selben Knoten geklickt haben, hebe Auswahl auf.
      if(unfinishedEdge) Graph.instance.removeEdge(unfinishedEdge.id);
      deselectNode();
  }else if(selectedNode == null) { // Falls wir nichts ausgewählt hatten, wähle den Knoten aus
      selectNode(d);
      var endNode = new Graph.Node(selectedNode.x, selectedNode.y, "invisible");
      unfinishedEdge = new Graph.Edge(selectedNode,endNode,"unfinished");
      Graph.instance.addUnfinishedEdge(unfinishedEdge);
      svgOrigin.style("cursor","crosshair") //crosshair
  }else {// Füge Kante hinzu
      unfinishedEdge.end=d; //throw away temporary end node;
      Graph.instance.removeEdge(unfinishedEdge.id);
      Graph.instance.edgeIds--;
      // check if edge already exists
      if (!Graph.instance.getEdgeBetween(unfinishedEdge.start, unfinishedEdge.end)) {  
          // only add edge if nodes are in different partitions
          // direction of the edges is always from partition U to partition V
          if (Graph.instance.isInU(d) && !Graph.instance.isInU(selectedNode)) {
              // change direction
              var copy = unfinishedEdge.start;
              unfinishedEdge.start = unfinishedEdge.end;
              unfinishedEdge.end = copy;
              Graph.instance.addCompleteEdge(unfinishedEdge);  
          } 
          else if (!Graph.instance.isInU(d) && Graph.instance.isInU(selectedNode)) {  
              Graph.instance.addCompleteEdge(unfinishedEdge);
          } 
      }
      deselectNode();
      that.updateEdges();
  }

  that.update();

  blurResourceEditor();

  d3.event.stopPropagation(); //we dont want svg to receive the event
}

function blurResourceEditor(){
  updateResources([]);
//   if(!myDiv) return;
//     myDiv
// //     .style("opacity",1e-6)
// //     .style("left", "0px")
// //     .style("top", "0px");
}

var myDiv = d3.select("body");//.append("div")

function updateResources(data){
      var selection = myDiv.selectAll("input.resourceEditor")
    .data(data);

  selection.enter().append("input")
      .attr("type","number")
      .attr("class", "tooltip resourceEditor")
//       .style("opacity", 1)

  selection
  .attr("value",function(a,b,c){ 
    return +a;
  })
  .on("input", function(a,b,c) {
     data[b]=+this.value;
     that.update()
  })
  .style("left", function(a,b,c){
    return (d3.event.pageX - 30+40*b) + "px"
  })
  .style("top", function(a,b,c){return (d3.event.pageY)+ "px"})

  if (selection.node()) selection.node().focus();

  selection.exit().remove();  
}

//<input type="number" min="0" max="360" step="5" value="0" id="nValue">
function dblclickResource(d,i,all)
{
  d3.event.stopPropagation();d3.event.preventDefault();
  updateResources(d.resources);  
}

function contextmenuNode(d){
  var unfinishedID = unfinishedEdge ? unfinishedEdge.id : null;
  deselectNode();
  d3.event.stopPropagation();d3.event.preventDefault();
  Graph.instance.removeNode(d.id);
  if(unfinishedID) Graph.instance.edges.remove(unfinishedID);
  that.update();
}

function contextmenuEdge(d){ 
  if (d == unfinishedEdge) {   
    Graph.instance.removeUnfinishedEdge(d.id);
  }  
  else Graph.instance.removeEdge(d.id);
  deselectNode();
  d3.event.stopPropagation();d3.event.preventDefault(); 
  that.updateEdges();
}


function addNode(pos){
  var xy = that.screenPosToNodePos(pos);
  var middleY = (graph_constants.U_POSITION + graph_constants.V_POSITION) * 0.5; 
  var inU = (xy.y <= middleY);   
  Graph.instance.addNode(inU);
  that.update();
//   return point;
}


}
GraphEditor.prototype = Object.create(GraphDrawer.prototype);
GraphEditor.prototype.constructor = GraphEditor;
